import asyncio
import argparse

from admyral.services.api_service import run_api
from admyral.services.worker_service import launch_worker


def parse_args() -> dict:
    parser = argparse.ArgumentParser(description="Admyral")
    parser.add_argument(
        "exec_type",
        choices=["api", "worker"],
    )
    parser.add_argument(
        "--docker",
        default=False,
        action="store_true",
    )
    return dict(parser.parse_args()._get_kwargs())


def worker(args: dict) -> None:
    asyncio.run(launch_worker(args))


def api(args: dict) -> None:
    asyncio.run(run_api(args))


def main() -> None:
    args = parse_args()
    match args["exec_type"]:
        case "worker":
            worker(args)
        case "api":
            api(args)


if __name__ == "__main__":
    main()
