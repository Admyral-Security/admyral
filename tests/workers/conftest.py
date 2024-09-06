import pytest

from admyral.db.admyral_store import AdmyralStore


@pytest.fixture(scope="session", autouse=True)
async def store():
    store = await AdmyralStore.create_test_store()
    return store
