SHELL := /bin/bash
SUBDIRS := $(dir $(wildcard functions/*/Makefile))

.PHONY:all setup deploy destroy up down clean stop-all remove-all
.PHONY: build $(SUBDIRS)

ifneq (,$(wildcard ./.env))
include .env
endif

all: setup init build

setup:
	@if not [ "$(hash brew)" 2>/dev/null ]; then \
		/usr/bin/ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)"; \
	fi

	@if not [ "$(hash pulumi)" 2>/dev/null ]; then \
		brew install pulumi; \
	fi

	@if [ ! -d "node_modules" ]; then \
		yarn install; \
	fi

build:
	npm run build
	
infra-install:
	@if [ ! -d "./infra/node_modules" ]; then \
		cd infra && npm install; \
	fi

infra-preview: infra-install
	cd infra && pulumi stack select ${AWS_ENV} && pulumi pre

infra-refresh: infra-install
	cd infra && pulumi stack select ${AWS_ENV} && pulumi refresh

infra-deploy: infra-install build
	cd infra && pulumi stack select ${AWS_ENV} && pulumi up

infra-destroy:
	cd infra && pulumi stack select ${AWS_ENV} && pulumi destroy

infra-erase:
	cd infra && pulumi stack select ${AWS_ENV} && pulumi stack rm -f
up:
	@docker pull localstack/localstack;
	TMPDIR=/private$(TMPDIR) docker-compose up -d;

down:
	TMPDIR=/private$(TMPDIR) docker-compose down;

clean:
	docker system prune -f;

stop-all:
	docker stop $(docker ps -aq);

remove-all:
	docker rm $(docker ps -aq);

invoke:
	aws lambda invoke \
		--region us-east-1 \
		--function-name "pulumi-localstack-local-getName" \
		--endpoint-url "http://localhost:4566" \
		--no-verify-ssl \
		output.log
