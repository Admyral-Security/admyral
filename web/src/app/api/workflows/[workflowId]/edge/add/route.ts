import prisma from "@/lib/db";
import { NextRequest } from "next/server";

// Add a new edge to a workflow
// POST /api/workflows/[workflowId]/edge/add
export async function POST(
	request: NextRequest,
	{ params }: { params: { workflowId: string } },
) {
	const { parentActionId, childActionId } = await request.json();

	// TODO: consider connection constraints (e.g., a webhook can't have an incoming edge)

	await prisma.workflow_edges.create({
		data: {
			workflow_id: params.workflowId,
			parent_action_id: parentActionId,
			child_action_id: childActionId,
		},
	});

	return new Response("success", { status: 201 });
}
