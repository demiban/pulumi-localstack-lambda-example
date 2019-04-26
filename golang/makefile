.PHONY:compile
.PHONY:run
.PHONY:ship
.PHONY: build

FILENAME := $(basename $(wildcard *.go))

build: compile compress
compile:
	GOOS=linux GOARCH=amd64 go build -o ${FILENAME} ${FILENAME}.go

run: 	compile
	@aws-okta exec sandbox -- sam local invoke "${FILENAME}" -e event.json

compress:	
	zip ${FILENAME}.zip ${FILENAME}
