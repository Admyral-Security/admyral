"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import z from "zod";
import { withSnakeCaseTransform } from "@/types/utils";
import { EditorWorkflowGraph } from "@/types/react-flow";
import { HTTPMethod } from "@/types/api";

const DISABLE_CACHE = 0;

// GET /editor/workflow
const GetWorkflowRequest = withSnakeCaseTransform(
	z.object({
		workflowId: z.string(),
	}),
);

const getWorkflow = api<
	z.input<typeof GetWorkflowRequest>,
	z.output<typeof EditorWorkflowGraph>
>({
	method: HTTPMethod.GET,
	path: "/api/v1/editor/workflow",
	requestSchema: GetWorkflowRequest,
	responseSchema: EditorWorkflowGraph,
});

export const useGetWorkflowApi = (workflowId: string, doApiCall: boolean) => {
	return useQuery({
		queryKey: ["workflow", workflowId],
		queryFn: () => getWorkflow({ workflowId }),
		enabled: doApiCall,
		gcTime: DISABLE_CACHE,
	});
};
