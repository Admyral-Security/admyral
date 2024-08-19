"use client";

import { useMutation } from "@tanstack/react-query";
import api from "@/lib/api";
import z from "zod";
import { withSnakeCaseTransform } from "@/types/utils";
import { HTTPMethod } from "@/types/api";

// DELETE /api/v1/workflows
const DeleteWorkflowRequest = withSnakeCaseTransform(
	z.object({
		workflowId: z.string(),
	}),
);
const DeleteWorkflowResponse = z.string().length(0);

const deleteWorkflow = api<
	z.input<typeof DeleteWorkflowRequest>,
	z.infer<typeof DeleteWorkflowResponse>
>({
	method: HTTPMethod.DELETE,
	path: "/api/v1/workflows",
	requestSchema: DeleteWorkflowRequest,
	responseSchema: DeleteWorkflowResponse,
});

export const useDeleteWorkflowApi = () => {
	return useMutation({
		mutationFn: (workflowId: string) => deleteWorkflow({ workflowId }),
	});
};
