"use client";

import { useMutation } from "@tanstack/react-query";
import z from "zod";
import api from "@/lib/api";
import {
	EditorWorkflowGraphSnakeCase,
	TEditorWorkflowGraph,
} from "@/types/react-flow";
import { HTTPMethod } from "@/types/api";
import {
	isValidWorkflowName,
	WORKFLOW_NAME_VALIDATION_ERROR_MESSAGE,
} from "@/lib/workflow-validation";
import { useWorkflowStore } from "@/stores/workflow-store";
import { useState } from "react";
import { ApiError } from "@/lib/errors";

// POST /editor/workflow/create
const CreateWorkflowResponse = z.string().length(0);

const createWorkflow = api<
	z.input<typeof EditorWorkflowGraphSnakeCase>,
	z.infer<typeof CreateWorkflowResponse>
>({
	method: HTTPMethod.POST,
	path: "/api/v1/editor/workflow/create",
	requestSchema: EditorWorkflowGraphSnakeCase,
	responseSchema: CreateWorkflowResponse,
});

const useCreateWorkflowApi = () => {
	return useMutation({
		mutationFn: (editorWorkflowGraph: TEditorWorkflowGraph) =>
			createWorkflow(editorWorkflowGraph),
	});
};

export function useCreateWorkflow() {
	const createWorkflowApi = useCreateWorkflowApi();
	const [isPending, setIsPending] = useState(false);
	const { getWorkflow, setIsNew } = useWorkflowStore();
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	const createWorkflow = async () => {
		setIsPending(true);
		setErrorMessage(null);
		try {
			const workflow = getWorkflow();
			if (workflow.workflowName.length === 0) {
				setErrorMessage(
					"Workflow name must not be empty. Go to settings to set one.",
				);
				return;
			}
			if (!isValidWorkflowName(workflow.workflowName)) {
				setErrorMessage(WORKFLOW_NAME_VALIDATION_ERROR_MESSAGE);
				return;
			}
			await createWorkflowApi.mutateAsync(workflow);

			setIsNew(false);
		} catch (error) {
			if (
				error instanceof ApiError &&
				error.details.startsWith("A workflow with the name")
			) {
				setErrorMessage(error.details);
			} else {
				setErrorMessage("Failed to save workflow. Please try again.");
			}
		} finally {
			setIsPending(false);
		}
	};

	return { createWorkflow, isPending, errorMessage };
}
