from admyral.db.admyral_store import AdmyralStore
from admyral.workers.workers_client import WorkersClient
from admyral.secret.secrets_manager import SecretsManager, secrets_manager_factory
from admyral.config.config import CONFIG


_admyral_store: AdmyralStore = None
_workers_client: WorkersClient = None
_secrets_manager: SecretsManager = None


async def setup_admyral_store() -> None:
    global _admyral_store
    _admyral_store = await AdmyralStore.create_store()


def get_admyral_store() -> AdmyralStore:
    global _admyral_store
    if not _admyral_store:
        raise RuntimeError("Admyral Store not initialized.")
    return _admyral_store


async def setup_workers_client() -> None:
    global _workers_client
    config = CONFIG
    _workers_client = await WorkersClient.connect(
        get_admyral_store(), config.temporal_host
    )


def get_workers_client() -> WorkersClient:
    global _workers_client
    if not _workers_client:
        raise RuntimeError("Workers Client not initialized.")
    return _workers_client


async def setup_secrets_manager() -> None:
    global _secrets_manager
    if not _admyral_store:
        raise RuntimeError(
            "Admyral Store is not initialized. Admyral Store must be initialized before Secrets Manager."
        )
    _secrets_manager = secrets_manager_factory(_admyral_store)


def get_secrets_manager() -> SecretsManager:
    global _secrets_manager
    if not _secrets_manager:
        raise RuntimeError("Secrets Manager not initialized.")
    return _secrets_manager


async def setup_dependencies():
    await setup_admyral_store()
    await setup_secrets_manager()
    await setup_workers_client()
