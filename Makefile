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

build: $(SUBDIRS)
$(SUBDIRS):
	@$(MAKE) -C $@ build

init:
	pulumi stack init $(STAGE) || pulumi stack select $(STAGE)

	pulumi config set aws:region $(REGION);

deploy: build
	pulumi up -y -s $(STAGE);

destroy:
	-pulumi destroy -y -s $(STAGE)

rm: destroy
	-pulumi stack rm -f -y -s $(STAGE)

up:
	@docker pull localstack/localstack:$(LS_VERSION);
	TMPDIR=/private$(TMPDIR) docker-compose up -d;

down:
	TMPDIR=/private$(TMPDIR) docker-compose down;

clean:
	docker system prune -f;

stop-all:
	docker stop $(docker ps -aq);

remove-all:
	docker rm $(docker ps -aq);
