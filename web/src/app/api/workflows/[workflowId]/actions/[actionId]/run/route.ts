import { createClient } from "@/utils/supabase/server";
import { NextRequest } from "next/server";

// GET /api/workflows/[workflowId]/actions/[actionId]/run
export async function GET(
	request: NextRequest,
	{ params }: { params: { workflowId: string; actionId: string } },
) {
	const supabase = createClient();

	const {
		data: { session },
	} = await supabase.auth.getSession();
	const jwt = session?.access_token;

	// TODO: support sending a payload for testing functionality
	const response = await fetch(
		`${process.env.WORKFLOW_RUNNER_API_URL}/trigger/${params.workflowId}`,
		{
			method: "POST",
			headers: {
				Authorization: `Bearer ${jwt}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				start_action_id: params.actionId,
			}),
		},
	);

	if (response.status != 202) {
		throw new Error(
			"Failed to trigger workflow with workflow Id: " + params.workflowId,
		);
	}

	return new Response("success", { status: 202 });
}
