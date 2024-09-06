"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import z from "zod";
import { WorkflowRunMetadata } from "@/types/workflow-runs";
import { HTTPMethod } from "@/types/api";

// GET /api/v1/runs/<workflow-id>
const ListWorkflowRunsRequest = z.void();
const ListWorkflowRunsResponse = z.array(WorkflowRunMetadata);

const buildListWorkflowRunsApi = (workflowId: string) =>
	api<
		z.infer<typeof ListWorkflowRunsRequest>,
		z.infer<typeof ListWorkflowRunsResponse>
	>({
		method: HTTPMethod.GET,
		path: `/api/v1/runs/${workflowId}`,
		requestSchema: ListWorkflowRunsRequest,
		responseSchema: ListWorkflowRunsResponse,
	});

const REFETCH_INTERVAL_1_SECOND = 1_000; // in ms

export const useListWorkflowRunsApi = (workflowId: string) => {
	return useQuery({
		queryKey: ["workflowRuns", workflowId],
		queryFn: () => buildListWorkflowRunsApi(workflowId)(),
		refetchInterval: REFETCH_INTERVAL_1_SECOND,
	});
};
