import prisma from "@/lib/db";
import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

// POST /api/workflows/setup
export async function POST() {
	const supabase = createClient();

	const {
		data: { user },
	} = await supabase.auth.getUser();
	const userId = user?.id;

	const workflow = await prisma.workflows.create({
		data: {
			workflow_name: "My Awesome Workflow",
			workflow_description: "",
			is_live: false,
			users: {
				connect: {
					user_id: userId,
				},
			},
		},
	});

	return NextResponse.json(
		{
			workflowId: workflow.workflow_id,
		},
		{
			status: 201,
		},
	);
}
