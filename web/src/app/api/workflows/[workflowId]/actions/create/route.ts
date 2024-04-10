import { createWebhookSecret } from "@/lib/crypto";
import prisma from "@/lib/db";
import { ActionType } from "@prisma/client";
import { generateReferenceHandle } from "@/lib/workflows";
import { transformObjectKeysToCamelCase } from "@/utils/utils";
import { NextRequest } from "next/server";

// Create a new action in a workflow
// POST /api/workflows/[workflowId]/actions/create
export async function POST(
	request: NextRequest,
	{ params }: { params: { workflowId: string } },
) {
	const { actionName, actionDescription, actionType } = await request.json();

	const referenceHandle = generateReferenceHandle(actionName);

	if (actionType === ActionType.Webhook) {
		const webhook = await prisma.webhooks.create({
			data: {
				actions: {
					create: {
						workflow_id: params.workflowId,
						action_name: actionName,
						reference_handle: referenceHandle,
						action_description: actionDescription,
						action_type: actionType,
						action_definition: {},
					},
				},
			},
			select: {
				actions: true,
				webhook_id: true,
			},
		});

		const webhookSecret = createWebhookSecret(webhook.webhook_id);

		await prisma.webhooks.update({
			where: {
				webhook_id: webhook.webhook_id,
			},
			data: {
				webhook_secret: webhookSecret,
			},
		});

		return Response.json({
			...transformObjectKeysToCamelCase(webhook.actions),
			webhookId: webhook.webhook_id,
			webhookSecret,
		});
	}

	const action = await prisma.actions.create({
		data: {
			workflow_id: params.workflowId,
			action_name: actionName,
			reference_handle: referenceHandle,
			action_description: actionDescription,
			action_type: actionType,
			action_definition: {},
		},
	});

	return Response.json(transformObjectKeysToCamelCase(action), {
		status: 201,
	});
}
