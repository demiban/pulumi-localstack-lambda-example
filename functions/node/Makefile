.PHONY: compress
.PHONY: build

FILENAME := $(basename $(wildcard *.js))

build: compress

compress:	
	zip ${FILENAME}.zip ${FILENAME}.js

run: compress
	sam local invoke -e event.json
