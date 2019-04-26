SHELL := /bin/bash
SUBDIRS := $(dir $(wildcard */makefile))

.PHONY:all setup deploy destroy up down clean stop-all remove-all
.PHONY: build $(SUBDIRS)

ifneq (,$(wildcard ./.env))
include .env
endif

all: setup build

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

	@docker pull localstack/localstack:$(LS_VERSION);

	pulumi stack init $(STACK) || pulumi stack select $(STACK)

	pulumi config set aws:region $(REGION);

build: $(SUBDIRS)
$(SUBDIRS):
	@$(MAKE) -C $@ build
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
