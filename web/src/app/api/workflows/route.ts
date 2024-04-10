import prisma from "@/lib/db";
import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

// List all workflows of a user
// GET /api/workflows
export async function GET() {
	const supabase = createClient();

	const {
		data: { user },
	} = await supabase.auth.getUser();
	const userId = user?.id;

	const workflow = await prisma.workflows.findMany({
		where: {
			user_id: userId,
		},
		select: {
			workflow_id: true,
			workflow_name: true,
			is_live: true,
		},
	});

	const workflowList = workflow.map((workflow) => ({
		workflowId: workflow.workflow_id,
		workflowName: workflow.workflow_name,
		isLive: workflow.is_live,
	}));

	return NextResponse.json(
		{
			workflows: workflowList,
		},
		{
			status: 200,
		},
	);
}
