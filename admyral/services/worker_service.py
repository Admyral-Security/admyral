from admyral.workers.worker import run_worker
from admyral.config.config import CONFIG


async def launch_worker(args: dict) -> None:
    # if args.get("docker"):
    #     target = "host.docker.internal:7233"
    # else:
    #     target = "127.0.0.1:7233"
    worker_name = "admyral-worker"
    await run_worker(worker_name, CONFIG.temporal_host, "workflow-queue")
