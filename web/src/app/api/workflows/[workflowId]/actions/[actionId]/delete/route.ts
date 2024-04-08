import prisma from "@/lib/db";
import { NextRequest } from "next/server";

// POST /api/workflows/[workflowId]/actions/[actionId]/delete
export async function POST(
	request: NextRequest,
	{ params }: { params: { workflowId: string; actionId: string } },
) {
	await prisma.actions.delete({
		where: {
			action_id: params.actionId,
		},
	});

	return new Response("success", { status: 204 });
}
