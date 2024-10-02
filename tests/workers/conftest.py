import pytest
import asyncio

from admyral.db.admyral_store import AdmyralStore
from admyral.config.config import TEST_USER_ID


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="session", autouse=True)
async def store(event_loop):
    store = await AdmyralStore.create_store()
    yield store
    await store.clean_up_workflow_data_of(TEST_USER_ID)
