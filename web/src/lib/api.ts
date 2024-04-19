"use server";

import { createClient } from "@/utils/supabase/server";
import { transformObjectKeysToCamelCase } from "@/utils/utils";
import { redirect } from "next/navigation";
import { encrypt } from "./crypto";
import { ActionNode, WorkflowData } from "./types";

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

export async function updateWorkflow(
	workflowId: string,
	workflowName: string | null,
	workflowDescription: string | null,
	isLive: boolean | null,
) {
	const token = await getAccessToken();

	const result = await fetch(
		`${process.env.BACKEND_API_URL}/api/v1/workflows/${workflowId}/update`,
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({
				workflow_name: workflowName,
				workflow_description: workflowDescription,
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
		`${process.env.BACKEND_API_URL}/api/v1/credentials/`,
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

export async function createAction(
	workflowId: string,
	actionType: ActionNode,
	actionName: string,
	xPosition: number,
	yPosition: number,
): Promise<string> {
	const accessToken = await getAccessToken();

	const result = await fetch(
		`${process.env.BACKEND_API_URL}/api/v1/workflows/${workflowId}/actions/create`,
		{
			method: "POST",
			headers: {
				Authorization: `Bearer ${accessToken}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				action_type: actionType,
				action_name: actionName,
				action_description: "",
				x_position: xPosition,
				y_position: yPosition,
			}),
		},
	);
	if (result.status !== 201) {
		throw new Error("Failed to create action!");
	}

	const actionId = await result.json();
	return actionId;
}

export async function updateWorkflowAndCreateIfNotExists(
	workflow: WorkflowData,
): Promise<WorkflowData> {
	// TODO: update
	// TODO: we must consider that we generate the webhook ID and webhook secret on the frontend server side!
	return workflow;
}
