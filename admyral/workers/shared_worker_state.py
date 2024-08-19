from admyral.utils.singleton import Singleton
from admyral.db.store_interface import StoreInterface
from admyral.secret.secrets_manager import SecretsManager


class SharedWorkerState(metaclass=Singleton):
    _store: StoreInterface = None
    _secrets_manager: SecretsManager = None

    @classmethod
    def init(cls, store: StoreInterface, secrets_manager: SecretsManager) -> None:
        cls._store = store
        cls._secrets_manager = secrets_manager

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
