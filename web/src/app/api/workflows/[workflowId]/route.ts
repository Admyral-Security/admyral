import prisma from "@/lib/db";
import { transformObjectKeysToCamelCase } from "@/utils/utils";
import { NextRequest, NextResponse } from "next/server";

// Fetch all necessary information of a workflow to visualize it in the builder
// GET /api/workflows/[workflowId]
export async function GET(
	request: NextRequest,
	{ params }: { params: { workflowId: string } },
) {
	console.log("Workflow ID: " + params.workflowId); // FIXME:

	// Fetch workflow data
	const workflowResult = await prisma.workflows.findUnique({
		where: {
			workflow_id: params.workflowId,
		},
		select: {
			workflow_description: true,
			workflow_name: true,
			is_live: true,
		},
	});
	if (!workflowResult) {
		throw new Error(`Workflow ${params.workflowId} does not exist!`);
	}

	const workflow = transformObjectKeysToCamelCase(workflowResult);

	// Fetch actions of the workflow
	const actionsPromise = prisma.actions.findMany({
		where: {
			workflow_id: params.workflowId,
		},
		select: {
			action_id: true,
			action_name: true,
			action_type: true,
		},
	});

	// Fetch edges of the workflow
	const edgesPromise = prisma.workflow_edges.findMany({
		where: {
			workflow_id: params.workflowId,
		},
		select: {
			parent_action_id: true,
			child_action_id: true,
		},
	});

	const [actionsResult, edgesResult] = await Promise.all([
		actionsPromise,
		edgesPromise,
	]);

	const actions = transformObjectKeysToCamelCase(actionsResult);
	const edges = transformObjectKeysToCamelCase(edgesResult);

	return NextResponse.json(
		{
			workflow,
			actions,
			edges,
		},
		{
			status: 200,
		},
	);
}
