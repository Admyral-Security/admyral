import requests
from admyral.typings import JsonValue

from admyral.models import (
    Workflow,
    WorkflowDAG,
    PythonAction,
    WorkflowPushResponse,
    Secret,
    WorkflowPushRequest,
    WorkflowTriggerResponse,
    SecretMetadata,
    ActionMetadata,
)
from admyral.config.config import API_V1_STR


class AdmyralClient:
    def __init__(
        self, base_url: str = "http://localhost:8000", api_key: str | None = None
    ) -> None:
        self.base_url = base_url
        self.api_key = api_key

    def _request(
        self,
        method: str,
        path: str,
        params: dict | None = None,
        json: JsonValue | None = None,
        webhook_secret: str | None = None,
    ) -> None | JsonValue:
        headers = {
            "Content-Type": "application/json",
        }
        if webhook_secret:
            headers["Authorization"] = webhook_secret
        elif self.api_key:
            headers["x-api-key"] = self.api_key

        response = None
        if method == "GET":
            response = requests.get(
                f"{self.base_url}{path}",
                headers=headers,
                params=params,
            )
        elif method == "POST":
            response = requests.post(
                f"{self.base_url}{path}", headers=headers, json=json, params=params
            )
        elif method == "DELETE":
            response = requests.delete(
                f"{self.base_url}{path}", headers=headers, json=json, params=params
            )
        else:
            raise NotImplementedError(f"Missing implementation for method: {method}")

        if response.status_code == 401:
            raise RuntimeError("Unauthorized. Please check your API key.")

        if not response.ok:
            error_message = response.text
            raise RuntimeError(
                f"Request failed with status code {response.status_code}. Error: {error_message}"
            )

        return response.json() if response.text else None

    def _get(self, path: str, params: dict = {}) -> None | JsonValue:
        return self._request("GET", path, params)

    def _post(
        self, path: str, json: JsonValue | None = None, params: dict = {}
    ) -> None | JsonValue:
        return self._request("POST", path, json=json, params=params)

    def _delete(
        self, path: str, json: JsonValue | None = None, params: dict = {}
    ) -> None | JsonValue:
        return self._request("DELETE", path, json=json, params=params)

    ########################################################
    # Workflows
    ########################################################

    def get_workflow(self, workflow_name: str) -> Workflow | None:
        """
        Returns the workflow with the given id if it exists.

        Args:
            workflow_name: The workflow name.

        Returns:
            The workflow with the given name if it exists, otherwise None.
        """
        result = self._get(f"{API_V1_STR}/workflows/{workflow_name}")
        return Workflow.model_validate(result) if result else None

    def push_workflow(
        self, workflow_name: str, workflow_dag: WorkflowDAG, is_active: bool = False
    ) -> WorkflowPushResponse:
        """
        Pushes the workflow to the server.

        Args:
            workflow_name: The workflow to push.

        Returns:
            The response from the server which contains the webhook id and secret
            if the workflow has webhook enabled.
        """
        response = self._post(
            f"{API_V1_STR}/workflows/{workflow_name}/push",
            WorkflowPushRequest(
                workflow_dag=workflow_dag,
                activate=is_active,
            ).model_dump(),
        )
        return WorkflowPushResponse.model_validate(response)

    def list_workflows(self) -> list[str]:
        """
        Returns a list of workflow ids of all pushed workflows.

        Returns:
            A list of workflow ids.
        """
        result = self._get(f"{API_V1_STR}/workflows/list")
        return [Workflow.model_validate(r) for r in result]

    def trigger_workflow(
        self, workflow_name: str, payload: JsonValue | None
    ) -> WorkflowTriggerResponse:
        """
        Trigger a workflow with the given name.

        Args:
            workflow_name: The workflow name.
            payload: The payload to send to the workflow.
        """
        response = self._post(
            f"{API_V1_STR}/workflows/{workflow_name}/trigger", payload
        )
        return WorkflowTriggerResponse.model_validate(response)

    def activate_workflow(self, workflow_name: str) -> None:
        """
        Activates the workflow with the given name.

        Args:
            workflow_name: The workflow name.
        """
        self._post(
            f"{API_V1_STR}/workflows/activate", json={"workflow_name": workflow_name}
        )

    def deactivate_workflow(self, workflow_name: str) -> None:
        """
        Deactivates the workflow with the given name.

        Args:
            workflow_name: The workflow name.
        """
        self._post(
            f"{API_V1_STR}/workflows/deactivate",
            json={"workflow_name": workflow_name},
        )

    ########################################################
    # Python Action
    ########################################################

    def push_action(self, python_action: PythonAction) -> None:
        """
        Pushes the action to the server.

        Args:
            python_action: The action to push.
        """
        self._post(f"{API_V1_STR}/actions/push", python_action.model_dump())

    def get_action(self, action_type: str) -> PythonAction | None:
        """
        Returns the action with the given type if it exists.

        Args:
            action_type: The action type.

        Returns:
            The action with the given type if it exists, otherwise None.
        """
        result = self._get(f"{API_V1_STR}/actions/{action_type}")
        return PythonAction.model_validate(result) if result else None

    def list_actions(self) -> list[ActionMetadata]:
        """
        Returns a list of action names.

        Returns:
            A list of action names.
        """

        result = self._get(f"{API_V1_STR}/actions")
        return [ActionMetadata.model_validate(r) for r in result]

    def delete_action(self, action_type: str) -> None:
        """
        Deletes the action with the given type.

        Args:
            action_type: The action type.
        """
        self._delete(f"{API_V1_STR}/actions/{action_type}")

    ########################################################
    # Secrets
    ########################################################

    def set_secret(self, secret: Secret) -> None:
        """
        Sets the secret. If the secret already exists, it will be overwritten.
        Otherwise, a new secret will be created.

        Args:
            secret: The secret to set.
        """
        self._post(f"{API_V1_STR}/secrets/set", secret.model_dump())

    def list_secrets(self) -> list[SecretMetadata]:
        """
        Returns a list of secret names.

        Returns:
            A list of secret names.
        """
        result = self._get(f"{API_V1_STR}/secrets/list")
        return [SecretMetadata.model_validate(r) for r in result]

    def delete_secret(self, secret_id: str) -> None:
        """
        Deletes the secret with the given id.

        Args:
            secret_id: The secret id
        """
        self._delete(f"{API_V1_STR}/secrets/delete", {"secret_id": secret_id})

    ########################################################
    # Webhook
    ########################################################

    def trigger_webhook(
        self, webhook_id: str, webhook_secret: str, payload: JsonValue | None
    ) -> WorkflowTriggerResponse:
        """
        Triggers the webhook with the given id.

        Args:
            webhook_id: The webhook id.
            webhook_secret: The webhook secret.
            payload: The payload to send to the webhook.
        """
        response = self._request(
            "POST",
            f"/webhooks/{webhook_id}",
            json=payload,
            webhook_secret=webhook_secret,
        )
        return WorkflowTriggerResponse.model_validate(response)
