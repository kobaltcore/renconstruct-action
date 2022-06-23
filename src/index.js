const fs = require("fs")
const path = require("path")
const core = require("@actions/core")
const exec = require("@actions/exec")
const glob = require("@actions/glob")
const cache = require("@actions/cache")
const github = require("@actions/github")
const tool_cache = require("@actions/tool-cache")
const http_client = require("@actions/http-client")

async function run() {
  const tool_names = ["renutil", "renotize", "renconstruct"]
  const renkit_github_os_map = {
    "windows": "win32",
    "linux": "linux",
    "macos": "darwin",
  }
  const renkit_github_arch_map = {
    "amd64": "x64",
    "i386": "x86",
    "arm64": "arm64",
  }

  let runner_os = process.platform
  let runner_arch = process.arch

  let renpy_version = core.getInput("renpy-version")
  const renkit_version = core.getInput("renkit-version")
  const renconstruct_config = core.toPlatformPath(core.getInput("renconstruct-config"))

  // exit if renconstruct_config file does not exist
  if (!fs.existsSync(renconstruct_config)) {
    throw new Error(`renconstruct config file not found at '${renconstruct_config}'`)
  }

  const http = new http_client.HttpClient("renconstruct-action")
  const resp = await http.get("https://api.github.com/repos/kobaltcore/renkit/releases")

  if (resp.message.statusCode != 200) {
    throw new Error(`Unable to get list of renkit releases: ${resp.message.statusCode}`)
  }

  let renkit_releases = JSON.parse(await resp.readBody()).sort((a, b) => Date.parse(a.published_at) > Date.parse(b.published_at))
  let renkit_releases_dict = {}
  for (release of renkit_releases) {
    renkit_releases_dict[release.tag_name] = release
  }

  let renkit_target_release = renkit_releases_dict[renkit_version] || renkit_releases[0]

  console.log(`Using renkit ${renkit_target_release['tag_name']}`)

  // install renkit given renkit_version
  console.log("Installing renkit")
  for (bin of renkit_target_release["assets"]) {
    const [os, arch] = bin["name"].split(".")[0].split("-").slice(1)
    if (renkit_github_os_map[os] === runner_os && renkit_github_arch_map[arch] === runner_arch) {
      console.log(`OS: ${os} | Arch: ${renkit_github_arch_map[arch]}`)
      console.log(`Downloading renkit from ${bin["browser_download_url"]}`)
      const renkit_path = await tool_cache.downloadTool(bin["browser_download_url"])
      console.log("Extracting renkit")
      const renkit_extracted_dir = await tool_cache.extractZip(renkit_path, core.toPlatformPath(path.resolve("../renkit")))
      core.addPath(renkit_extracted_dir)
      break
    }
  }

  // resolve renpy version if "latest"
  if (renpy_version === "latest") {
    renpy_version = ""
    await exec.exec("renutil", ["list", "-a", "-n=1"], { listeners: { stdout: (data) => { renpy_version += data.toString() }, }, })
    renpy_version = renpy_version.trim()
  }

  // activate Java 8
  process.env.JAVA_HOME = process.env.JAVA_HOME_8_X64

  // install renpy given renpy_version
  console.log("attempting to restore cache")
  const cache_key = `renpy-${renpy_version}`
  const cache_dir = core.toPlatformPath(path.resolve("../cache-renpy"))
  const cache_key_ret = await cache.restoreCache([cache_dir], cache_key)
  if (cache_key_ret === undefined) {
    console.log("cache empty, installing renpy")

    // install renpy into cache
    // we do this before renconstruct gets to it so we'll
    // end up with a clean cache without build artifacts
    await exec.exec("renutil", ["install", `-r=${cache_dir}`, `-v=${renpy_version}`])

    console.log("saving cache")
    const cache_id = await cache.saveCache([cache_dir], cache_key)
  }

  console.log("before build")
  // run renconstruct
  await exec.exec("renconstruct", ["build", `-r=${cache_dir}`, `-v=${renpy_version}`, `-c=${renconstruct_config}`, "-i=.", `-o=${core.toPlatformPath("../out-renconstruct")}`])

  console.log("after build")

  console.log("before glob")
  // generate output list of built distributions
  const distribution_dir = core.toPlatformPath(path.resolve("../out-renconstruct/*"))
  const globber = await glob.create(distribution_dir)
  const distributions = await globber.glob()
  console.log("after glob")

  console.log(distributions)
  console.log(distribution_dir)
  console.log("after print")

  core.setOutput("distributions", distributions)
  core.setOutput("distribution_dir", distribution_dir)
}

try {
  run()
} catch (error) {
  core.setFailed(error.message)
}
