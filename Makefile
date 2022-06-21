build:
	ncc build --license licenses.txt src/index.js

build-mini:
	ncc build --license licenses.txt -m src/index.js

install:
	npm install

run:
	node src/index.js
