#!/bin/bash

mkdir admyral/cli/docker_compose
touch admyral/cli/docker_compose/__init__.py
cp -rf deploy/docker-compose/* admyral/cli/docker_compose/
