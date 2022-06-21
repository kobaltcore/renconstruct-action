# Ren'Py Build Action

This action packages renkit and Ren'Py to allow the easy building and distribution of Ren'Py projects.

## Inputs

### `renpy-version`

The version of Ren'Py to use during the build. Defaults `latest`.

### `renkit-version`

The version of renkit to use during the build. Defaults `latest`.

### `renconstruct-config`

The path to the reoncstruct config file, relative to the root of the repository. Defaults `renconstruct.toml`.

## Outputs

### `distributions`

A list of file names of built distributions.

## Example usage

```yaml
uses: kobaltcore/renkit-action@v1
with:
  renkit-version: 2.0.0
  renpy-version: 7.5.0
  renconstruct-config: config/renconstruct.toml
```

## FAQ

### My build aborts because it runs out of space

GitHub Actions runners come with a limited amount of disk space which can't easily be expanded.
You may use this action to gain 6-8GB more: https://github.com/easimon/maximize-build-space
