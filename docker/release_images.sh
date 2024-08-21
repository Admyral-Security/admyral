#!/bin/bash

if command -v docker-compose &> /dev/null
then
    COMPOSE_CMD="docker-compose"
else
    COMPOSE_CMD="docker compose"
fi


services=("api" "worker" "web")
contexts=(".." ".." "../web")

for i in "${!services[@]}"; do
    service=${services[$i]}
    docker rmi admyralai/$service:latest
done


# Stop execution on any error (Note: we use set -e because docker rmi might fail because the image does not exist which is okay)
set -e
# set -x


for i in "${!services[@]}"; do
    service=${services[$i]}
    context=${contexts[$i]}

    echo "Building and pushing image for $service..."
    docker buildx build \
        --platform=linux/amd64,linux/arm64 \
        --file=./Dockerfile.$service \
        --tag=admyralai/$service:latest \
        --push \
        $context
    echo "Finished building and pushing image for $service."
done
