build:
	ncc build --license licenses.txt index.js

build-mini:
	ncc build --license licenses.txt -m index.js

install:
	npm install

run:
	node index.js
