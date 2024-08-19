#!/bin/bash

if command -v docker-compose &> /dev/null
then
    COMPOSE_CMD="docker-compose"
else
    COMPOSE_CMD="docker compose"
fi


services=("api" "web" "worker")

for service in "${services[@]}"; do
    docker rmi admyralai/$service:latest
done

/bin/bash -c "$COMPOSE_CMD -f build.yml build --no-cache"


for service in "${services[@]}"; do
    docker push admyralai/${service}:latest
done
