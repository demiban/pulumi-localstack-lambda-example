.PHONY:compress
.PHONY: build

FILENAME := $(basename $(wildcard *.js))

build: compress

compress:	
	zip ${FILENAME}.zip ${FILENAME}.js

run: compress
	@aws-okta exec sandbox -- sam local invoke "${FILENAME}" -e event.json
