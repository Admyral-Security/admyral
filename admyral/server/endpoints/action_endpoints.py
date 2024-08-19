from typing import Optional
from fastapi import APIRouter, status

from admyral.models import PythonAction
from admyral.server.deps import get_admyral_store


router = APIRouter()


@router.post("/push", status_code=status.HTTP_204_NO_CONTENT)
async def push_action(python_action: PythonAction):
    """
    Push a Python action to the store. If the action for the provided action type already exists for the user,
    it will be overwritten.

    Args:
        python_action: The Python action object.
    """
    await get_admyral_store().store_action(python_action)


@router.get(
    "/{action_type}", status_code=status.HTTP_200_OK, response_model=PythonAction
)
async def get_action(action_type: str) -> Optional[PythonAction]:
    """
    Get a Python action by its action type.

    Args:
        action_type: The action type.

    Returns:
        The Python action object.
    """
    return await get_admyral_store().get_action(action_type)
