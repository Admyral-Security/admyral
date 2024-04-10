import prisma from "@/lib/db";
import { NextRequest } from "next/server";

// Update metadata of a workflow
// POST /api/workflows/[workflowId]/update
export async function POST(
	request: NextRequest,
	{ params }: { params: { workflowId: string } },
) {
	const { workflowName, workflowDescription, isLive } = await request.json();

	const data = {} as Record<string, string>;
	if (workflowName) {
		data.workflow_name = workflowName;
	}
	if (workflowDescription) {
		data.workflow_description = workflowDescription;
	}
	if (isLive !== null) {
		data.is_live = isLive;
	}

	await prisma.workflows.update({
		where: {
			workflow_id: params.workflowId,
		},
		data,
	});

	return new Response(null, { status: 204 });
}
