SHELL := /bin/bash
HANDLER_DIR := handler

ifneq (,$(wildcard ./.env))
include .env
endif

STACK := $(APP_NAME)-$(STAGE)

all: setup build up

setup:
	@if not [ "$(hash brew)" 2>/dev/null ]; then \
		/usr/bin/ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)"; \
	fi

	@if not [ "$(hash pulumi)" 2>/dev/null ]; then \
		brew install pulumi; \
	fi

	@if [ ! -d "node_modules" ]; then \
		npm config set loglevel warn; \
		npm install; \
	fi

	@docker pull localstack/localstack:0.8.8;

	pulumi stack init $(STACK) || pulumi stack select $(STACK)

	pulumi config set aws:region $(REGION);

build:
	@cd $(HANDLER_DIR); \
	for F in ./*.js; do \
		var="$${F%.js}"; \
		zip $$var.zip $$F; \
	done

deploy:
	pulumi up -y -s $(STACK);

destroy:
	-pulumi destroy -y -s $(STACK)

	-pulumi stack rm -f -y -s $(STACK)

up:
	TMPDIR=/private$(TMPDIR) docker-compose up -d;

down:
	TMPDIR=/private$(TMPDIR) docker-compose down;

clean:
	docker system prune -f;

stop-all:
	docker stop $(docker ps -aq);

remove-all:
	docker rm $(docker ps -aq);
