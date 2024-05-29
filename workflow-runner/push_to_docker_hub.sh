#!/bin/bash

docker rmi admyralai/workflow-runner:latest
docker build . -t admyralai/workflow-runner:latest
docker push admyralai/workflow-runner:latest
