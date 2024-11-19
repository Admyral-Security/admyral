"use client";

import { useSaveWorkflowApi } from "@/hooks/use-save-workflow-api";
import { useWorkflowStore } from "@/stores/workflow-store";
import React, { createContext, useContext, useState } from "react";
import { AxiosError } from "axios";
import { useEditorActionStore } from "@/stores/editor-action-store";
import { EditorWorkflowNodeType } from "@/types/react-flow";
import { useToast } from "@/providers/toast";
import {
	isValidResultName,
	isValidWorkflowName,
	WORKFLOW_NAME_VALIDATION_ERROR_MESSAGE,
} from "@/lib/workflow-validation";
import { WorkflowValidationError } from "@/lib/errors";

interface SaveWorkflowContextType {
	saveWorkflow: () => Promise<boolean>;
	isPending: boolean;
}

const SaveWorkflowContext = createContext<SaveWorkflowContextType>({
	saveWorkflow: async () => false,
	isPending: false,
});

export function SaveWorkflowProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	const { getWorkflow, updateWebhookIdAndSecret } = useWorkflowStore();
	const { actionsIndex } = useEditorActionStore();
	const saveWorkflow = useSaveWorkflowApi();
	const { errorToast, infoToast } = useToast();
	const [isPending, setIsPending] = useState(false);

	const handleSaveWorkflow = async () => {
		setIsPending(true);

		try {
			const workflow = getWorkflow();
			if (Object.keys(actionsIndex).length === 0) {
				throw new WorkflowValidationError(
					"Editor actions must be loaded to save the workflow.",
				);
			}
			if (workflow.workflowName.length === 0) {
				throw new WorkflowValidationError(
					"Workflow name must not be empty. Go to settings to set one.",
				);
			}
			if (!isValidWorkflowName(workflow.workflowName)) {
				throw new WorkflowValidationError(
					WORKFLOW_NAME_VALIDATION_ERROR_MESSAGE,
				);
			}

			if (
				workflow.nodes
					.filter(
						(node) => node.type === EditorWorkflowNodeType.ACTION,
					)
					.some(
						(node) =>
							node.resultName !== null &&
							!isValidResultName(node.resultName),
					)
			) {
				throw new WorkflowValidationError(
					"Invalid node result name. Result names must be snake_case.",
				);
			}

			// Make sure that we only save args which are present in the current
			// action definition. If an action is updated and an argument is
			// removed, we want to clean it up here.
			const nodes = workflow.nodes.map((node) => {
				if (node.type === EditorWorkflowNodeType.ACTION) {
					const argsFilter = new Set(
						actionsIndex[node.actionType].arguments.map(
							(arg) => arg.argName,
						),
					);
					const args = Object.keys(node.args)
						.filter((argName) => argsFilter.has(argName))
						.reduce(
							(acc, argName) => {
								acc[argName] = node.args[argName];
								return acc;
							},
							{} as Record<string, string>,
						);
					return {
						...node,
						args,
					};
				}
				return node;
			});

			const { webhookId, webhookSecret } = await saveWorkflow.mutateAsync(
				{
					...workflow,
					nodes,
				},
			);

			infoToast("Workflow saved.");

			if (webhookId && webhookSecret) {
				updateWebhookIdAndSecret(webhookId, webhookSecret);
			}
			return true;
		} catch (error) {
			if (
				error instanceof AxiosError &&
				(error.response?.data as any).detail.startsWith(
					"A workflow with the name",
				)
			) {
				errorToast((error.response?.data as any).detail);
			} else if (error instanceof WorkflowValidationError) {
				errorToast(error.message);
			} else {
				errorToast("Failed to save workflow. Please try again.");
			}
			return false;
		} finally {
			setIsPending(false);
		}
	};

	return (
		<SaveWorkflowContext.Provider
			value={{ saveWorkflow: handleSaveWorkflow, isPending }}
		>
			{children}
		</SaveWorkflowContext.Provider>
	);
}

export default function useSaveWorkflow() {
	const context = useContext(SaveWorkflowContext);
	if (context === undefined) {
		throw new Error("useSaveWorkflow must be used within a ToastProvider");
	}
	return context;
}
