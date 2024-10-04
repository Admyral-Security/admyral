from typing import Optional
from fastapi import APIRouter, status, Depends

from admyral.server.auth import authenticate
from admyral.models import PythonAction, AuthenticatedUser, ActionMetadata
from admyral.server.deps import get_admyral_store


router = APIRouter()


@router.post("/push", status_code=status.HTTP_204_NO_CONTENT)
async def push_action(
    python_action: PythonAction,
    authenticated_user: AuthenticatedUser = Depends(authenticate),
) -> None:
    """
    Push a Python action to the store. If the action for the provided action type already exists for the user,
    it will be overwritten.

    Args:
        python_action: The Python action object.
    """
    await get_admyral_store().store_action(
        user_id=authenticated_user.user_id, action=python_action
    )


@router.get("", status_code=status.HTTP_200_OK)
async def list_actions(
    authenticated_user: AuthenticatedUser = Depends(authenticate),
) -> list[ActionMetadata]:
    """
    List all stored custom Python actions.

    Returns:
        A list of stored custom Python action objects.
    """
    return await get_admyral_store().list_actions(user_id=authenticated_user.user_id)


@router.delete("/{action_type}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_action(
    action_type: str, authenticated_user: AuthenticatedUser = Depends(authenticate)
) -> None:
    """
    Delete a stored custom Python action by its action type.

    Args:
        action_type: function name of the custom Python action.
    """
    await get_admyral_store().delete_action(
        action_type=action_type, user_id=authenticated_user.user_id
    )


@router.get("/{action_type}", status_code=status.HTTP_200_OK)
async def get_action(
    action_type: str, authenticated_user: AuthenticatedUser = Depends(AuthenticatedUser)
) -> Optional[PythonAction]:
    """
    Get a Python action by its action type.

    Args:
        action_type: The action type.

    Returns:
        The Python action object.
    """
    return await get_admyral_store().get_action(
        user_id=authenticated_user.user_id, action_type=action_type
    )
