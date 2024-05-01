import { createWebhookSecret } from "./crypto";

export function generateReferenceHandle(actionName: string): string {
	// TODO: make sure that reference handle is unique within a workflow
	return actionName.toLowerCase().replaceAll(" ", "_");
}

export async function generateWebhook(): Promise<{
	webhookId: string;
	secret: string;
}> {
	const webhookId = crypto.randomUUID();
	const secret = await createWebhookSecret(webhookId);
	return { webhookId, secret };
}

export const NEW_MARKER = "new_";
