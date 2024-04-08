import prisma from "@/lib/db";
import { NextRequest } from "next/server";

export async function POST(
	request: NextRequest,
	{ params }: { params: { workflowId: string } },
) {
	await prisma.workflows.delete({
		where: {
			workflow_id: params.workflowId,
		},
	});

	return new Response("success", { status: 204 });
}
