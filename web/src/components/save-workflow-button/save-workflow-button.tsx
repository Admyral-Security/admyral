"use client";

import { Button } from "@radix-ui/themes";
import { DiscIcon } from "@radix-ui/react-icons";
import { useSaveWorkflowApi } from "@/hooks/use-save-workflow-api";
import { useWorkflowStore } from "@/stores/workflow-store";
import { useEffect } from "react";
import { errorToast, infoToast } from "@/lib/toast";
import { AxiosError } from "axios";

export default function SaveWorkflowButton() {
	const { getWorkflow, updateWebhookIdAndSecret } = useWorkflowStore();
	const saveWorkflow = useSaveWorkflowApi();

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
		// TODO(frontend): validate workflow name
		if (workflow.workflowName.length === 0) {
			errorToast("Workflow name must not be empty!");
			return;
		}
		saveWorkflow.mutate(workflow);
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
