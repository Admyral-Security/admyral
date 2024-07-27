#!/bin/bash

docker rmi admyralai/workflow-runner:latest
docker build --platform linux/amd64,linux/arm64 . -t admyralai/workflow-runner:latest
docker push admyralai/workflow-runner:latest
