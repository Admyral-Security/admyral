import { createWebhookSecret } from "./crypto";
import { ActionNode, ActionData } from "./types";

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

export async function initActionData(
	actionType: ActionNode,
	actionId: string,
	actionName: string,
	xPosition: number,
	yPosition: number,
): Promise<ActionData> {
	const base = {
		actionId,
		actionName,
		referenceHandle: generateReferenceHandle(actionName),
		actionType,
		actionDescription: "",
		xPosition,
		yPosition,
	};

	switch (actionType) {
		case ActionNode.WEBHOOK:
			const webhookData = await generateWebhook();
			return {
				...base,
				webhookId: webhookData.webhookId,
				secret: webhookData.secret,
			};

		case ActionNode.HTTP_REQUEST:
			return {
				...base,
				actionDefinition: {
					method: "GET",
					url: "",
					contentType: "application/json",
					headers: [],
					payload: "",
				},
			};

		case ActionNode.AI_ACTION:
			return {
				...base,
				actionDefinition: {
					prompt: "",
				},
			};

		case ActionNode.IF_CONDITION:
			return {
				...base,
				actionDefinition: {
					conditions: [],
				},
			};

		case ActionNode.SEND_EMAIL:
			return {
				...base,
				actionDefinition: {
					recipients: [],
					subject: "",
					body: "",
					senderName: "",
				},
			};

		case ActionNode.RECEIVE_EMAIL:
			// TODO:
			return base;

		default:
			throw new Error("Unhandled action type: " + actionType);
	}
}
