"use client";

import { useMutation } from "@tanstack/react-query";
import z from "zod";
import api from "@/lib/api";
import { Json, TJson } from "@/types/json";
import { HTTPMethod } from "@/types/api";

enum TriggerStatus {
	SUCCESS = "SUCCESS",
	INACTIVE = "INACTIVE",
}

// GET /api/v1/workflows/<workflow-id>/trigger
const WorkflowTriggerRequest = Json;
const WorkflowTriggerResponse = z.object({
	status: z.nativeEnum(TriggerStatus),
});

const buildTriggerWorkflowApi = (workflowName: string) =>
	api<
		z.input<typeof WorkflowTriggerRequest>,
		z.infer<typeof WorkflowTriggerResponse>
	>({
		method: HTTPMethod.POST,
		path: `/api/v1/workflows/${workflowName}/trigger`,
		requestSchema: WorkflowTriggerRequest,
		responseSchema: WorkflowTriggerResponse,
	});

export const useTriggerWorkflowApi = () => {
	return useMutation({
		mutationFn: ({
			workflowName,
			payload,
		}: {
			workflowName: string;
			payload: TJson;
		}) => {
			return buildTriggerWorkflowApi(workflowName)(payload);
		},
	});
};
