SHELL := /bin/bash
HANDLER_DIR := handler
CONF := config/deploy-config.json

define GetConf
$(shell node -p "require('./$(CONF)').$(1)")
endef

APP_NAME := $(call GetConf,name)
REGION := $(call GetConf,region)
STAGE :=$(call GetConf,stage)
STACK := $(APP_NAME)-$(STAGE)

#all: setup

setup:
	@if not [ "$(hash brew)" 2>/dev/null ]; then \
		/usr/bin/ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)"; \
	fi

	@if not [ "$(hash pulumi)" 2>/dev/null ]; then \
		brew install pulumi; \
	fi

	@if [ ! -d "node_modules" ]; then \
		npm install --save @pulumi/aws mime; \
	fi

	docker pull localstack/localstack:0.8.8;

deploy:
	cd $(HANDLER_DIR); \
	for F in ./*.js; do \
		var="$${F%.js}"; \
		zip $$var.zip $$F; \
	done

	-pulumi stack init $(STACK);

	pulumi config set aws:region $(REGION);

	pulumi up;

destroy:
	-pulumi destroy -s $(STACK)

	-pulumi stack rm -f -s $(STACK)

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
