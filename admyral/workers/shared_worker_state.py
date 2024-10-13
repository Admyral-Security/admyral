from admyral.utils.singleton import Singleton
from admyral.db.store_interface import StoreInterface
from admyral.secret.secrets_manager import SecretsManager
from admyral.workers.workers_client import WorkersClient
from admyral.config.config import CONFIG


class SharedWorkerState(metaclass=Singleton):
    _store: StoreInterface = None
    _secrets_manager: SecretsManager = None
    _workers_client: WorkersClient = None

    @classmethod
    async def init(cls, store: StoreInterface, secrets_manager: SecretsManager) -> None:
        cls._store = store
        cls._secrets_manager = secrets_manager
        cls._workers_client = await WorkersClient.connect(store, CONFIG.temporal_host)

    @classmethod
    def get_store(cls) -> StoreInterface:
        if not cls._store:
            raise RuntimeError("SharedWorkerState not initialized.")
        return cls._store

    @classmethod
    def get_secrets_manager(cls) -> SecretsManager:
        if not cls._secrets_manager:
            raise RuntimeError("SharedWorkerState not initialized.")
        return cls._secrets_manager

    @classmethod
    def get_workers_client(cls) -> WorkersClient:
        if not cls._workers_client:
            raise RuntimeError("SharedWorkerState not initialized.")
        return cls._workers_client
