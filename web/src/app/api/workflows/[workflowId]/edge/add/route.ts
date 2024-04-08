import prisma from "@/lib/db";
import { NextRequest } from "next/server";

// POST /api/workflows/[workflowId]/edge/add
export async function POST(
	request: NextRequest,
	{ params }: { params: { workflowId: string } },
) {
	const {
		parentActionId,
		parentReferenceHandle,
		childActionId,
		childReferenceHandle,
	} = await request.json();

	// Check whether the edge already exists
	// TODO:

	// TODO: what happens if a row with the same primary key already exists?
	await prisma.workflow_edges.create({
		data: {
			workflow_id: params.workflowId,
			parent_action_id: parentActionId,
			parent_reference_handle: parentReferenceHandle,
			child_action_id: childActionId,
			child_reference_handle: childReferenceHandle,
		},
	});

	return new Response("success", { status: 201 });
}
