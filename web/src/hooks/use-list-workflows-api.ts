"use client";

import { useQuery } from "@tanstack/react-query";
import { WorkflowMetadata } from "@/types/workflows";
import api from "@/lib/api";
import z from "zod";
import { HTTPMethod } from "@/types/api";

// GET /api/v1/workflows/list
const ListWorkflowsRequest = z.void();
const ListWorkflowsResponse = z.array(WorkflowMetadata);

const listWorkflows = api<
	z.infer<typeof ListWorkflowsRequest>,
	z.infer<typeof ListWorkflowsResponse>
>({
	method: HTTPMethod.GET,
	path: "/api/v1/workflows",
	requestSchema: ListWorkflowsRequest,
	responseSchema: ListWorkflowsResponse,
});

export const useListWorkflowsApi = () => {
	return useQuery({
		queryKey: ["workflowsList"],
		queryFn: () => listWorkflows(),
	});
};
