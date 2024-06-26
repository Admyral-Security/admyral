"use server";

import { createClient } from "@/utils/supabase/server";
import {
	transformObjectKeysToCamelCase,
	transformObjectKeysToSnakeCase,
} from "@/utils/utils";
import { redirect } from "next/navigation";
import { encrypt } from "./crypto";
import {
	ActionNode,
	GenerateWorkflowResult,
	Quota,
	UserProfile,
	WorkflowData,
	WorkflowRun,
	WorkflowRunEvent,
	WorkflowTemplate,
	Credential,
} from "./types";
import { IntegrationType } from "./integrations";
import { generateWebhook } from "./workflow-node";

async function getAccessToken() {
	const supabase = createClient();

	const {
		data: { session },
	} = await supabase.auth.getSession();
	if (session === null) {
		throw new Error("Failed to get session");
	}

	return session.access_token;
}

async function getUserIdAndAccessToken() {
	const supabase = createClient();

	const {
		data: { session },
	} = await supabase.auth.getSession();
	if (session === null) {
		throw new Error("Failed to get session");
	}
	const token = session.access_token;

	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (user === null) {
		throw new Error("Failed to get user");
	}
	const userId = user.id;

	return [userId, token];
}

export async function listWorkflows() {
	const token = await getAccessToken();

	const result = await fetch(
		`${process.env.BACKEND_API_URL}/api/v1/workflows`,
		{
			method: "GET",
			cache: "no-store",
			headers: {
				Authorization: `Bearer ${token}`,
			},
		},
	);
	if (result.status !== 200) {
		const error = await result.text();
		console.log("Failed to list workflows. Received error: ", error);
		throw new Error("Failed to load workflows!");
	}

	const data = await result.json();
	return transformObjectKeysToCamelCase(data);
}

export async function createNewWorkflow() {
	const token = await getAccessToken();

	const result = await fetch(
		`${process.env.BACKEND_API_URL}/api/v1/workflows/create`,
		{
			method: "POST",
			headers: {
				Authorization: `Bearer ${token}`,
			},
		},
	);

	if (result.status !== 201) {
		const error = await result.text();
		console.log("Failed to create new workflow. Received error: ", error);
		throw new Error("Failed to create new workflow!");
	}

	const workflowId = await result.json();

	redirect(`/workflows/${workflowId}`);
}

export async function publishWorkflow(workflowId: string, isLive: boolean) {
	const token = await getAccessToken();

	const result = await fetch(
		`${process.env.BACKEND_API_URL}/api/v1/workflows/${workflowId}/publish`,
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({
				is_live: isLive,
			}),
		},
	);

	if (result.status !== 204) {
		const error = await result.text();
		console.log("Failed to publish workflow. Received error: ", error);
		throw new Error("Failed to publish workflow!");
	}
}

export async function loadUserProfile(): Promise<UserProfile> {
	const [userId, accessToken] = await getUserIdAndAccessToken();

	const result = await fetch(
		`${process.env.BACKEND_API_URL}/api/v1/profile/${userId}`,
		{
			method: "GET",
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
		},
	);
	if (result.status !== 200) {
		const error = await result.text();
		console.log("Failed to load user profile. Received error: ", error);
		throw new Error("Failed to load user profile!");
	}

	const userProfile = await result.json();
	return transformObjectKeysToCamelCase(userProfile);
}

export async function loadUserQuota(): Promise<Quota> {
	const [userId, accessToken] = await getUserIdAndAccessToken();

	const result = await fetch(
		`${process.env.BACKEND_API_URL}/api/v1/profile/${userId}/quota`,
		{
			method: "GET",
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
		},
	);
	if (result.status !== 200) {
		const error = await result.text();
		console.log("Failed to load quota. Received error: ", error);
		throw new Error("Failed to load quota!");
	}

	const quota = await result.json();
	return transformObjectKeysToCamelCase(quota);
}

export interface UserProfileUpdate {
	firstName?: string;
	lastName?: string;
	company?: string;
	role?: string;
	additionalInfo?: string;
}

export async function updateUserProfile(update: UserProfileUpdate) {
	const [userId, accessToken] = await getUserIdAndAccessToken();

	const body = JSON.stringify({
		first_name: update.firstName || null,
		last_name: update.lastName || null,
		company: update.company || null,
		email: null,
		role: update.role || null,
		additional_info: update.additionalInfo || null,
	});

	const result = await fetch(
		`${process.env.BACKEND_API_URL}/api/v1/profile/${userId}/update`,
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${accessToken}`,
			},
			body,
		},
	);
	if (result.status !== 204) {
		const error = await result.text();
		console.log("Failed to update user profile. Received error: ", error);
		throw new Error("Failed to update user profile!");
	}
}

export async function deleteAccount() {
	const [userId, accessToken] = await getUserIdAndAccessToken();

	const result = await fetch(
		`${process.env.BACKEND_API_URL}/api/v1/profile/${userId}/delete`,
		{
			method: "POST",
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
		},
	);
	if (result.status !== 204) {
		const error = await result.text();
		console.log("Failed to list user profile. Received error: ", error);
		throw new Error("Failed to delete user profile!");
	}

	const supabase = createClient();
	await supabase.auth.signOut();
	redirect("/login");
}

export async function listCredentials(
	integrationTypeFilter: IntegrationType | null = null,
): Promise<Credential[]> {
	const accessToken = await getAccessToken();

	const queryParams =
		integrationTypeFilter !== null
			? `?integration_type=${integrationTypeFilter}`
			: "";

	const result = await fetch(
		`${process.env.BACKEND_API_URL}/api/v1/credentials${queryParams}`,
		{
			method: "GET",
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
		},
	);
	if (result.status !== 200) {
		const error = await result.text();
		console.log("Failed to list credentials. Received error: ", error);
		throw new Error("Failed to list credentials!");
	}

	const credentials = await result.json();
	return transformObjectKeysToCamelCase(credentials);
}

export async function createCredential(
	credentialName: string,
	value: string,
	credentialType: IntegrationType | null = null,
) {
	const accessToken = await getAccessToken();

	const encryptedSecret = await encrypt(value);

	const result = await fetch(
		`${process.env.BACKEND_API_URL}/api/v1/credentials/create`,
		{
			method: "POST",
			headers: {
				Authorization: `Bearer ${accessToken}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				credential_name: credentialName,
				encrypted_secret: encryptedSecret,
				credential_type: credentialType,
			}),
		},
	);
	if (result.status !== 204) {
		// TODO: return better error messages (e.g., we need to distinguish between duplicate credential names and other errors)
		const error = await result.text();
		console.log("Failed to create credential. Received error: ", error);
		throw new Error("Failed to create credential! Error: " + error);
	}
}

export async function deleteCredential(credentialName: string) {
	const accessToken = await getAccessToken();

	const result = await fetch(
		`${process.env.BACKEND_API_URL}/api/v1/credentials/delete`,
		{
			method: "POST",
			headers: {
				Authorization: `Bearer ${accessToken}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				credential_name: credentialName,
			}),
		},
	);
	if (result.status !== 204) {
		const error = await result.text();
		console.log("Failed to delete credential. Received error: ", error);
		throw new Error("Failed to delete credential!");
	}
}

export async function getWorkflow(workflowId: string): Promise<WorkflowData> {
	const accessToken = await getAccessToken();

	const result = await fetch(
		`${process.env.BACKEND_API_URL}/api/v1/workflows/${workflowId}`,
		{
			method: "GET",
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
		},
	);
	if (result.status !== 200) {
		const error = await result.text();
		console.log("Failed to get workflow. Received error: ", error);
		throw new Error("Failed to get workflow!");
	}

	const rawWorkflow = await result.json();
	let workflow = transformObjectKeysToCamelCase(rawWorkflow);

	// If we have a manual start action, we proactively generate a webhook for it,
	// so that the user can easily switch between manual and webhook start types.
	for (let action of workflow.actions) {
		if (action.actionType === ActionNode.MANUAL_START) {
			const webhookData = await generateWebhook();
			action.webhookId = webhookData.webhookId;
			action.secret = webhookData.secret;
		}
	}

	return workflow;
}

export async function deleteWorkflow(workflowId: string) {
	const accessToken = await getAccessToken();

	const result = await fetch(
		`${process.env.BACKEND_API_URL}/api/v1/workflows/${workflowId}/delete`,
		{
			method: "POST",
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
		},
	);
	if (result.status !== 204) {
		const error = await result.text();
		console.log("Failed to delete workflow. Received error: ", error);
		throw new Error("Failed to delete workflow!");
	}
	redirect("/");
}

export async function updateWorkflowAndCreateIfNotExists(
	workflowId: string,
	workflow: WorkflowData,
	deletedNodes: string[],
	deletedEdges: [string, string][],
): Promise<WorkflowData> {
	const accessToken = await getAccessToken();

	const body = JSON.stringify({
		workflow: transformObjectKeysToSnakeCase(workflow),
		deleted_nodes: deletedNodes,
		deleted_edges: deletedEdges,
	});

	const result = await fetch(
		`${process.env.BACKEND_API_URL}/api/v1/workflows/${workflowId}/update`,
		{
			method: "POST",
			headers: {
				Authorization: `Bearer ${accessToken}`,
				"Content-Type": "application/json",
			},
			body,
		},
	);
	if (result.status !== 201) {
		const error = await result.text();
		console.log("Failed to update workflow. Received error: ", error);
		throw new Error("Failed to update workflow!");
	}

	const updatedWorkflow = await result.json();
	return transformObjectKeysToCamelCase(
		updatedWorkflow,
		new Set(["action_definition"]),
	);
}

export async function triggerWorkflowFromAction(
	workflowId: string,
	actionId: string,
	payload: string | null,
): Promise<void> {
	const accessToken = await getAccessToken();

	const init =
		payload === null
			? {
					method: "POST",
					headers: {
						Authorization: `Bearer ${accessToken}`,
						"Content-Type": "application/json",
					},
					body: JSON.stringify(null),
				}
			: {
					method: "POST",
					headers: {
						Authorization: `Bearer ${accessToken}`,
						"Content-Type": "application/json",
					},
					body: payload,
				};

	const result = await fetch(
		`${process.env.WORKFLOW_RUNNER_API_URL}/trigger/${workflowId}/${actionId}`,
		init as any,
	);
	if (result.status !== 202) {
		const error = await result.text();
		console.log("Failed to trigger workflow. Received error: ", error);
		if (
			result.status === 403 &&
			error === "Workflow run quota limit exceeded"
		) {
			throw new Error("Workflow run quota limit exceeded!");
		}
		throw new Error("Failed to trigger workflow!");
	}
}

export async function loadWorkflowTemplates(): Promise<WorkflowTemplate[]> {
	const accessToken = await getAccessToken();

	const result = await fetch(
		`${process.env.BACKEND_API_URL}/api/v1/workflows/templates/list`,
		{
			method: "GET",
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
		},
	);
	if (result.status !== 200) {
		const error = await result.text();
		console.log(
			"Failed to load workflow templates. Received error: ",
			error,
		);
		throw new Error("Failed to load workflow templates!");
	}

	const templates = await result.json();
	return transformObjectKeysToCamelCase(templates);
}

export async function importWorkflowFromTemplate(
	templateWorkflowId: string,
): Promise<void> {
	const accessToken = await getAccessToken();

	const result = await fetch(
		`${process.env.BACKEND_API_URL}/api/v1/workflows/templates/import/${templateWorkflowId}`,
		{
			method: "POST",
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
		},
	);
	if (result.status !== 201) {
		const error = await result.text();
		console.error(
			`Received the following error while importing workflow: ${error}`,
		);
		throw new Error("Failed to import workflow from template!");
	}

	const workflowId = await result.json();
	redirect(`/workflows/${workflowId}`);
}

export async function loadWorkflowRuns(
	workflowId: string,
): Promise<WorkflowRun[]> {
	const accessToken = await getAccessToken();

	const result = await fetch(
		`${process.env.BACKEND_API_URL}/api/v1/workflows/${workflowId}/runs`,
		{
			method: "GET",
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
		},
	);
	if (result.status !== 200) {
		const error = await result.text();
		console.log("Failed to load workflow runs. Received error: ", error);
		throw new Error("Failed to load workflow runs!");
	}

	const workflowRuns = await result.json();
	return transformObjectKeysToCamelCase(workflowRuns);
}

export async function loadWorkflowRunEvents(
	workflowId: string,
	runId: string,
): Promise<WorkflowRunEvent[]> {
	const accessToken = await getAccessToken();

	const result = await fetch(
		`${process.env.BACKEND_API_URL}/api/v1/workflows/${workflowId}/runs/${runId}`,
		{
			method: "GET",
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
		},
	);
	if (result.status !== 200) {
		const error = await result.text();
		console.log(
			"Failed to load workflow run traces. Received error: ",
			error,
		);
		throw new Error("Failed to load workflow run traces!");
	}

	const traces = await result.json();
	return transformObjectKeysToCamelCase(traces, new Set(["action_state"]));
}

export async function generateWorkflow(
	userInput: string,
): Promise<GenerateWorkflowResult> {
	const accessToken = await getAccessToken();

	const result = await fetch(
		`${process.env.BACKEND_API_URL}/api/v1/workflow-generation/generate`,
		{
			method: "POST",
			headers: {
				Authorization: `Bearer ${accessToken}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				user_input: userInput,
			}),
		},
	);
	if (result.status !== 200) {
		const error = await result.json();
		console.log("Failed to generate workflow. Received error: ", error);
		if (result.status === 403 && error.detail === "Quota limit exceeded") {
			throw new Error(
				"Quota limit exceeded. You have reached the maximum number of workflow generations per day.",
			);
		}
		throw new Error("Failed to generate workflow");
	}
	const workflow = await result.json();
	return transformObjectKeysToCamelCase(workflow);
}

export async function triggerWorkflowWebhook(
	webhookId: string,
	secret: string,
	data: string | null,
) {
	const init =
		data !== null
			? {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: data,
					cache: "no-store",
				}
			: {
					method: "GET",
					cache: "no-store",
				};

	const result = await fetch(
		`${process.env.WORKFLOW_RUNNER_API_URL}/webhook/${webhookId}/${secret}`,
		init as any,
	);
	if (result.status !== 200) {
		const error = await result.json();
		console.log("Failed to trigger webhook. Received error: ", error);
		throw new Error("Failed to trigger webhook!");
	}
}
