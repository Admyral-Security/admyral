"use client";

// Due to docker-compose networking, we need to call the workflow runner API from the client
export async function triggerWorkflowWebhook(
	webhookId: string,
	secret: string,
	data: string | null,
) {
	const init =
		data !== null
			? {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: data,
					cache: "no-store",
				}
			: {
					method: "GET",
					cache: "no-store",
				};
	const result = await fetch(
		`${process.env.NEXT_PUBLIC_WORKFLOW_RUNNER_API_URL}/webhook/${webhookId}/${secret}`,
		init as any,
	);
	if (result.status !== 201) {
		throw new Error("Failed to trigger webhook!");
	}
}
