import prisma from "@/lib/db";
import { NextRequest } from "next/server";

// Delete an edge from a workflow
// POST /api/workflows/[workflowId]/edge/delete
export async function POST(request: NextRequest) {
	const { parentActionId, childActionId } = await request.json();

	await prisma.workflow_edges.delete({
		where: {
			parent_action_id_child_action_id: {
				parent_action_id: parentActionId,
				child_action_id: childActionId,
			},
		},
	});

	return new Response(null, { status: 204 });
}
