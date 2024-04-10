import prisma from "@/lib/db";
import { generateReferenceHandle } from "@/lib/workflows";
import { NextRequest } from "next/server";

// Update an action
// POST /api/workflows/[workflowId]/actions/[actionId]/update
export async function POST(
	request: NextRequest,
	{ params }: { params: { workflowId: string; actionId: string } },
) {
	const { actionName, actionDescription, actionDefinition } =
		await request.json();

	const data = {} as Record<string, any>;
	if (actionName) {
		data.action_name = actionName;
		data.reference_handle = generateReferenceHandle(actionName);
	}
	if (actionDescription) {
		data.action_description = actionDescription;
	}
	if (actionDefinition) {
		// TODO: validate action definition based on action type
		data.action_definition = actionDefinition;
	}

	await prisma.actions.update({
		where: {
			action_id: params.actionId,
		},
		data,
	});

	return new Response(null, { status: 204 });
}
