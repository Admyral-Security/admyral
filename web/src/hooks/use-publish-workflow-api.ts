"use client";

import { useMutation } from "@tanstack/react-query";
import z from "zod";
import api from "@/lib/api";
import { withSnakeCaseTransform } from "@/types/utils";
import { HTTPMethod } from "@/types/api";

// GET /api/v1/workflows/activate
// GET /api/v1/workflows/deactivate
const PublishWorkflowRequest = withSnakeCaseTransform(
	z.object({
		workflowId: z.string(),
	}),
);
const PublishWorkflowResponse = z.boolean();

const buildPublishWorkflowApi = (activate: boolean) => {
	return api<
		z.input<typeof PublishWorkflowRequest>,
		z.infer<typeof PublishWorkflowResponse>
	>({
		method: HTTPMethod.POST,
		path: `/api/v1/workflows/${activate ? "activate" : "deactivate"}`,
		requestSchema: PublishWorkflowRequest,
		responseSchema: PublishWorkflowResponse,
	});
};

export const usePublishWorkflowApi = () => {
	return useMutation({
		mutationFn: ({
			workflowId,
			newActivationState,
		}: {
			workflowId: string;
			newActivationState: boolean;
		}) => {
			return buildPublishWorkflowApi(newActivationState)({ workflowId });
		},
	});
};
