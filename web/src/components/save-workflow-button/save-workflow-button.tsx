"use client";

import { Button } from "@radix-ui/themes";
import { DiscIcon } from "@radix-ui/react-icons";
import { useSaveWorkflowApi } from "@/hooks/use-save-workflow-api";
import { useWorkflowStore } from "@/stores/workflow-store";
import { useEffect } from "react";
import { AxiosError } from "axios";
import { useEditorActionStore } from "@/stores/editor-action-store";
import { EditorWorkflowNodeType } from "@/types/react-flow";
import { useToast } from "@/providers/toast";
import {
	isValidWorkflowName,
	WORKFLOW_NAME_VALIDATION_ERROR_MESSAGE,
} from "@/lib/workflow-validation";

export default function SaveWorkflowButton() {
	const { getWorkflow, updateWebhookIdAndSecret } = useWorkflowStore();
	const { actionsIndex } = useEditorActionStore();
	const saveWorkflow = useSaveWorkflowApi();
	const { errorToast, infoToast } = useToast();

	useEffect(() => {
		if (saveWorkflow.isSuccess) {
			infoToast("Workflow saved.");
			const { webhookId, webhookSecret } = saveWorkflow.data;
			if (webhookId && webhookSecret) {
				updateWebhookIdAndSecret(webhookId, webhookSecret);
			}
			saveWorkflow.reset();
		}
		if (saveWorkflow.isError) {
			if (
				saveWorkflow.error instanceof AxiosError &&
				(
					(saveWorkflow.error as AxiosError).response?.data as any
				).detail.startsWith("A workflow with the name")
			) {
				errorToast(
					((saveWorkflow.error as AxiosError).response?.data as any)
						.detail,
				);
			} else {
				errorToast("Failed to save workflow. Please try again.");
			}
			saveWorkflow.reset();
		}
	}, [saveWorkflow, updateWebhookIdAndSecret]);

	const handleSaveWorkflow = () => {
		const workflow = getWorkflow();
		if (Object.keys(actionsIndex).length === 0) {
			errorToast("Editor actions must be loaded to save the workflow.");
			return;
		}
		if (workflow.workflowName.length === 0) {
			errorToast(
				"Workflow name must not be empty. Go to settings to set one.",
			);
			return;
		}
		if (!isValidWorkflowName(workflow.workflowName)) {
			errorToast(WORKFLOW_NAME_VALIDATION_ERROR_MESSAGE);
			return;
		}

		if (workflow.controls) {
			workflow.controls = workflow.controls.filter(
				(control) => control.trim() !== "",
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

		saveWorkflow.mutate({
			...workflow,
			nodes,
		});
	};

	return (
		<Button
			variant="solid"
			size="2"
			onClick={handleSaveWorkflow}
			style={{
				cursor: "pointer",
			}}
			loading={saveWorkflow.isPending}
		>
			<DiscIcon />
			Save
		</Button>
	);
}
