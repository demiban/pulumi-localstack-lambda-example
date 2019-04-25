.PHONY:compress
.PHONY: build

FILENAME := $(basename $(wildcard *.js))

build: compress

compress:	
	zip ${FILENAME}.zip ${FILENAME}.js
