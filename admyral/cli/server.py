import click
import os
import subprocess

from admyral.cli.cli import cli
from admyral.utils.docker_utils import (
    is_docker_running,
    get_docker_compose_cmd,
    list_running_docker_containers,
    clean_up_old_images,
)
from admyral.utils.telemetry import capture
from admyral.config.config import get_local_postgres_volume
from admyral import __version__

WELCOME_MESSAGE = """

 _       __     __                             __      
| |     / /__  / /________  ____ ___  ___     / /_____ 
| | /| / / _ \\/ / ___/ __ \\/ __ `__ \\/ _ \\   / __/ __ \\
| |/ |/ /  __/ / /__/ /_/ / / / / / /  __/  / /_/ /_/ /
|__/|__/\\___/_/\\___/\\____/_/ /_/ /_/\\___/  _\\__/\\____/ 
   /   | ____/ /___ ___  __  ___________ _/ /          
  / /| |/ __  / __ `__ \\/ / / / ___/ __ `/ /           
 / ___ / /_/ / / / / / / /_/ / /  / /_/ / /            
/_/  |_\\__,_/_/ /_/ /_/\\__, /_/   \\__,_/_/             
                      /____/                           

"""


def _get_docker_compose_dir_path() -> str:
    if os.path.exists(os.path.join(os.path.dirname(__file__), "docker_compose")):
        docker_compose_dir_path = os.path.join(
            os.path.dirname(__file__), "docker_compose"
        )
    else:
        docker_compose_dir_path = os.path.join(
            os.path.dirname(__file__), "..", "..", "deploy", "docker-compose"
        )
    assert os.path.exists(docker_compose_dir_path)
    return docker_compose_dir_path


@cli.command("up", help="Start Admyral locally.")
def up() -> None:
    """
    Launches Admyral services locally.
    """
    capture(event_name="server:up")

    click.echo(WELCOME_MESSAGE)

    click.echo(f"Admyral Version: {__version__}\n")

    if not is_docker_running():
        click.echo(
            "Docker daemon is not running. Please make sure that Docker is installed and running."
        )
        return

    env = os.environ.copy()
    admyral_web_port = os.environ.get("ADMYRAL_WEB_PORT", "3000")

    # check if container is already running
    running_containers = list_running_docker_containers()
    all_services = {
        "admyral-web",
        "admyral-worker",
        "admyral-api",
        "temporal-admin-tools",
        "temporal-ui",
        "temporal",
        "postgresql",
        "temporal-elasticsearch",
    }
    if len(set(running_containers) & all_services) == len(all_services):
        click.echo("Admyral is already running.")
        click.echo(
            f"You can access the Admyral UI at http://localhost:{admyral_web_port} or use the Admyral CLI.\n"
        )
        return

    # figure out the path of the docker-compose directory
    docker_compose_dir_path = _get_docker_compose_dir_path()

    # clean up old images
    click.echo("\nCleaning up old images...")
    for repository_name in ["admyralai/web", "admyralai/api", "admyralai/worker"]:
        clean_up_old_images(
            repository_name=repository_name, current_version=__version__
        )
    click.echo("Done.")

    command = get_docker_compose_cmd()
    command.append("up")
    command.append("-d")

    if openai_api_key := os.environ.get("OPENAI_API_KEY"):
        env["OPENAI_API_KEY"] = openai_api_key
    else:
        click.echo(
            'Warning: OPENAI_API_KEY environment variable is not set. The "ai_action" action will not work!'
        )
    if (
        os.environ.get("RESEND_API_KEY") is None
        or os.environ.get("RESEND_EMAIL") is None
    ):
        click.echo(
            'Warning: RESEND_API_KEY or RESEND_EMAIL environment variables are not set. The "send_email" action will not work!'
        )
    else:
        env["RESEND_API_KEY"] = os.environ.get("RESEND_API_KEY")
        env["RESEND_EMAIL"] = os.environ.get("RESEND_EMAIL")

    # Set persistance path
    env["POSTGRES_VOLUME_PATH"] = get_local_postgres_volume()

    env["ADMYRAL_VERSION"] = __version__
    env["ADMYRAL_DISABLE_AUTH"] = "true"

    click.echo("\nStarting Admyral...\n")

    try:
        subprocess.run(command, check=True, cwd=docker_compose_dir_path, env=env)
    except subprocess.CalledProcessError as e:
        click.echo(f"Command failed with error: {e}")
        return

    click.echo("\nAdmyral is up and running.")
    click.echo(
        f"You can access the Admyral UI at http://localhost:{admyral_web_port} or use the Admyral CLI.\n"
    )


@cli.command("down", help="Stop Admyral locally.")
def down() -> None:
    """
    Tears down Admyral services locally.
    """
    capture(event_name="server:down")

    if not is_docker_running():
        click.echo(
            "Docker daemon is not running. Please make sure that Docker is installed and running."
        )
        return

    docker_compose_dir_path = _get_docker_compose_dir_path()
    command = get_docker_compose_cmd()
    command.append("down")

    # Set persistance path
    env = os.environ.copy()
    env["POSTGRES_VOLUME_PATH"] = get_local_postgres_volume()
    env["ADMYRAL_VERSION"] = __version__
    env["ADMYRAL_DISABLE_AUTH"] = "true"

    click.echo("\nShutting Admyral down...\n")

    try:
        subprocess.run(command, check=True, cwd=docker_compose_dir_path, env=env)
    except subprocess.CalledProcessError as e:
        click.echo(f"Command failed with error: {e}")
        return

    click.echo("\nAdmyral is shut down.\n")


# @cli.command("show", help="Show information about Admyral.")
# def show() -> None:
#     """
#     Show information about Admyral.
#     """
#     show_status()


# @cli.command("logs", help="Display logs for Admyral.")
# @click.option("--follow", "-f", is_flag=True, help="Follow the logs.")
# @click.option(
#     "--tail",
#     "-t",
#     type=click.INT,
#     help="Number of lines to display from the end of the logs.",
# )
# def logs(follow: bool, tail: int) -> None:
#     """
#     Display logs for Admyral.

#     Args:
#         follow: Follow the logs.
#         tail: Number of lines to display from the end of the logs.
#     """
#     for log in show_logs(follow, tail):
#         click.echo(log)
