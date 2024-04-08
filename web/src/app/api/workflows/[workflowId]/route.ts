import prisma from "@/lib/db";
import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// GET /api/workflows/[workflowId]
export async function GET(
	request: NextRequest,
	{ params }: { params: { workflowId: string } },
) {
	const supabase = createClient();

	const {
		data: { user },
	} = await supabase.auth.getUser();
	const userId = user?.id;

	// Fetch workflow data
	const workflow = await prisma.workflows.findUnique({
		where: {
			workflow_id: params.workflowId,
		},
	});
	if (!workflow) {
		throw new Error(`Workflow ${params.workflowId} does not exist!`);
	}

	// Fetch actions of the workflow
	const actionsPromise = prisma.actions.findMany({
		where: {
			workflow_id: workflow.workflow_id,
		},
		select: {
			action_id: true,
			action_name: true,
		},
	});

	// Fetch edges of the workflow
	const edgesPromise = prisma.workflow_edges.findMany({
		where: {
			workflow_id: workflow.workflow_id,
		},
		select: {
			parent_action_id: true,
			child_action_id: true,
		},
	});

	const [actions, edges] = await Promise.all([actionsPromise, edgesPromise]);

	// TODO: output data structure
	return NextResponse.json(
		{},
		{
			status: 200,
		},
	);
}
