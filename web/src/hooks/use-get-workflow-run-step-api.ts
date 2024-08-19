"use client";

import { useQuery } from "@tanstack/react-query";
import { WorkflowRunStep } from "@/types/workflow-runs";
import api from "@/lib/api";
import z from "zod";
import { HTTPMethod } from "@/types/api";

// GET /api/v1/runs/<workflow-id>/<workflow-run-id>/<workflow-run-step-id>
const GetWorkflowRunStepRequest = z.void();

const buildGetWorkflowRunStepApi = (
	workflowId: string,
	workflowRunId: string,
	workflowRunStepId: string,
) =>
	api<
		z.infer<typeof GetWorkflowRunStepRequest>,
		z.infer<typeof WorkflowRunStep>
	>({
		method: HTTPMethod.GET,
		path: `/api/v1/runs/${workflowId}/${workflowRunId}/${workflowRunStepId}`,
		requestSchema: GetWorkflowRunStepRequest,
		responseSchema: WorkflowRunStep,
	});

export const useGetWorkflowRunStepApi = (
	workflowId: string,
	workflowRunId: string,
	workflowRunStepId: string,
) => {
	return useQuery({
		queryKey: [
			"workflowRunStep",
			workflowId,
			workflowRunId,
			workflowRunStepId,
		],
		queryFn: () =>
			buildGetWorkflowRunStepApi(
				workflowId,
				workflowRunId,
				workflowRunStepId,
			)(),
	});
};
