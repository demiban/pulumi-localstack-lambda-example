#!/usr/bin/env bash

if not hash brew 2>/dev/null; then
	/usr/bin/ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)"
fi

if not hash pulumi 2>/dev/null; then
    brew install pulumi
fi

# install node.js required packages
npm install --save @pulumi/aws mime

# Get Localstack docker image
docker pull localstack/localstack:0.8.8