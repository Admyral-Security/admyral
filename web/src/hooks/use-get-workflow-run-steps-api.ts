"use client";

import { useQuery } from "@tanstack/react-query";
import { WorkflowRunStepMetadata } from "@/types/workflow-runs";
import api from "@/lib/api";
import z from "zod";
import { HTTPMethod } from "@/types/api";

// GET /api/v1/runs/<workflow-id>/<workflow-run-id>
const GetWorkflowRunStepsRequest = z.void();
const GetWorkflowRunStepsResponse = z.array(WorkflowRunStepMetadata);

const buildGetWorkflowRunStepsApi = (
	workflowId: string,
	workflowRunId: string,
) =>
	api<
		z.infer<typeof GetWorkflowRunStepsRequest>,
		z.infer<typeof GetWorkflowRunStepsResponse>
	>({
		method: HTTPMethod.GET,
		path: `/api/v1/runs/${workflowId}/${workflowRunId}`,
		requestSchema: GetWorkflowRunStepsRequest,
		responseSchema: GetWorkflowRunStepsResponse,
	});

export const useGetWorkflowRunStepsApi = (
	workflowId: string,
	workflowRunId: string,
) => {
	return useQuery({
		queryKey: ["workflowRunSteps", workflowId, workflowRunId],
		queryFn: () => buildGetWorkflowRunStepsApi(workflowId, workflowRunId)(),
	});
};
