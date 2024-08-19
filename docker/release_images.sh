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


for service in "${!services[@]}"; do
    service=${services[$i]}
    context=${contexts[$i]}

    docker buildx build \
        --platform=linux/amd64,linux/arm64 \
        --file=./Dockerfile.$service \
        --tag=admyralai/$service:latest \
        --push \
        $context
done
