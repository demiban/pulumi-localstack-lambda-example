.PHONY:compile
.PHONY:run
.PHONY:ship
.PHONY: build

FILENAME := $(basename $(wildcard *.go))

build: compile compress
compile:
	GOOS=linux GOARCH=amd64 go build -o ${FILENAME} ${FILENAME}.go

compress:	
	zip ${FILENAME}.zip ${FILENAME}

run: 	compile
	sam local invoke "${FILENAME}" -e event.json
