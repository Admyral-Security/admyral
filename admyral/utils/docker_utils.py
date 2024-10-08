from docker import DockerClient
import shutil


def is_docker_running() -> bool:
    """
    Check for running Docker daemon.

    Returns:
        bool: True if Docker daemon is running, False otherwise.
    """
    try:
        docker_client = DockerClient.from_env()
        docker_client.ping()
        return True
    except Exception:
        return False


def get_docker_compose_cmd() -> list[str]:
    if shutil.which("docker-compose") is not None:
        return ["docker-compose"]
    return ["docker", "compose"]


def list_running_docker_containers() -> list[str]:
    docker_client = DockerClient.from_env()
    containers = docker_client.containers.list()
    return [container.name for container in containers]


def clean_up_old_images(
    repository_name: str, current_version: str | None = None
) -> None:
    docker_client = DockerClient.from_env()
    images = docker_client.images.list(name=repository_name)
    for image in images:
        if current_version and f"{repository_name}:{current_version}" in image.tags:
            continue
        image.remove(force=True)
