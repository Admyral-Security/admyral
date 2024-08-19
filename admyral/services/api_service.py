import uvicorn


async def run_api(config: dict) -> None:
    config = uvicorn.Config(
        "admyral.server.server:app",
        host="0.0.0.0" if config.get("docker") else "127.0.0.1",
        port=8000,
    )
    server = uvicorn.Server(config)
    await server.serve()
