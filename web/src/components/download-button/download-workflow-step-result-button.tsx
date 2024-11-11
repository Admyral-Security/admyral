"use client";

import { useDownloadWorkflowRunStepResult } from "@/hooks/use-download-workflow-run-step-result";
import { useToast } from "@/providers/toast";
import { DownloadIcon } from "@radix-ui/react-icons";
import { IconButton } from "@radix-ui/themes";
import { useEffect } from "react";

interface DownloadWorkflowStepResultButtonProps {
	workflowId: string;
	runId: string;
	stepId: string;
}

export function DownloadWorkflowStepResultButton({
	workflowId,
	runId,
	stepId,
}: DownloadWorkflowStepResultButtonProps) {
	const {
		mutate: downloadResult,
		isPending,
		error,
	} = useDownloadWorkflowRunStepResult();
	const { errorToast } = useToast();

	useEffect(() => {
		if (error) {
			errorToast(
				"Failed to download workflow step result. Please try again.",
			);
		}
	}, [error]);

	return (
		<IconButton
			onClick={() => downloadResult({ workflowId, runId, stepId })}
			variant="ghost"
			disabled={isPending}
			style={{ cursor: "pointer" }}
			size="1"
		>
			<DownloadIcon height={16} width={16} />
		</IconButton>
	);
}
