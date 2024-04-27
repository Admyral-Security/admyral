"use server";

import { createClient } from "@/utils/supabase/server";
import {
	TransformType,
	transformObjectKeysToCamelCase,
	transformObjectKeysToSnakeCase,
} from "@/utils/utils";
import { redirect } from "next/navigation";
import { encrypt } from "./crypto";
import {
	WorkflowData,
	WorkflowRun,
	WorkflowRunEvent,
	WorkflowTemplate,
} from "./types";

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
		// Error!
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
		throw new Error("Failed to update workflow!");
	}
}

export async function loadUserProfile() {
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
		throw new Error("Failed to load user profile!");
	}

	const userProfile = await result.json();
	return transformObjectKeysToCamelCase(userProfile);
}

export async function updateUserProfile(
	firstName: string,
	lastName: string,
	company: string,
) {
	const [userId, accessToken] = await getUserIdAndAccessToken();

	const result = await fetch(
		`${process.env.BACKEND_API_URL}/api/v1/profile/${userId}/update`,
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${accessToken}`,
			},
			body: JSON.stringify({
				first_name: firstName,
				last_name: lastName,
				company,
				email: null,
			}),
		},
	);
	if (result.status !== 204) {
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
		throw new Error("Failed to delete user profile!");
	}

	const supabase = createClient();
	await supabase.auth.signOut();
	redirect("/login");
}

export async function listCredentials() {
	const accessToken = await getAccessToken();

	const result = await fetch(
		`${process.env.BACKEND_API_URL}/api/v1/credentials`,
		{
			method: "GET",
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
		},
	);
	if (result.status !== 200) {
		throw new Error("Failed to list credentials!");
	}

	return result.json();
}

export async function createCredential(credentialName: string, value: string) {
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
			}),
		},
	);
	if (result.status !== 204) {
		throw new Error("Failed to create credential!");
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
		throw new Error("Failed to delete credential!");
	}
}

export async function getWorkflow(workflowId: string) {
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
		throw new Error("Failed to get workflow!");
	}

	const workflow = await result.json();
	return transformObjectKeysToCamelCase(workflow);
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
		throw new Error("Failed to update workflow!");
	}

	const updatedWorkflow = await result.json();
	return transformObjectKeysToCamelCase(updatedWorkflow);
}

export async function triggerWorkflowFromAction(
	workflowId: string,
	actionId: string,
): Promise<void> {
	const accessToken = await getAccessToken();

	const result = await fetch(
		`${process.env.NEXT_PUBLIC_WORKFLOW_RUNNER_API_URL}/trigger/${workflowId}/${actionId}`,
		{
			method: "POST",
			headers: {
				Authorization: `Bearer ${accessToken}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				payload: null,
			}),
		},
	);
	if (result.status !== 202) {
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
		throw new Error("Failed to load workflow run traces!");
	}

	const traces = await result.json();
	return transformObjectKeysToCamelCase(traces, TransformType.TOP_LEVEL_ONLY);
}
