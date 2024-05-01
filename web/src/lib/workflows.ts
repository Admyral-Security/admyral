"use server";

import { createClient } from "@/utils/supabase/server";
import { ActionNode, ActionData, LLM } from "./types";
import { generateReferenceHandle, generateWebhook } from "./workflow-node";

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
		webhookId: null,
		secret: null,
	};

	switch (actionType) {
		case ActionNode.WEBHOOK:
			const webhookData = await generateWebhook();
			return {
				...base,
				actionDefinition: {},
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
					model: LLM.GPT4_TURBO,
				},
			};

		case ActionNode.IF_CONDITION:
			return {
				...base,
				actionDefinition: {
					conditions: [],
				},
			};

		case ActionNode.SEND_EMAIL: {
			// Get the current user's email to initialize recipients
			const supbase = createClient();
			const {
				data: { user },
				error,
			} = await supbase.auth.getUser();

			const recipients = [];
			if (!error && user) {
				recipients.push(user.email);
			}

			return {
				...base,
				actionDefinition: {
					recipients,
					subject: "",
					body: "",
					senderName: "",
				},
			};
		}

		case ActionNode.RECEIVE_EMAIL:
			// TODO:
			return { ...base, actionDefinition: {} };

		case ActionNode.NOTE:
			return {
				...base,
				actionDefinition: {
					note: "",
				},
			};

		default:
			throw new Error("Unhandled action type: " + actionType);
	}
}
