import { useDownloadWorkflowRunStepResult } from "@/hooks/use-download-workflow-run-step-result";
import { DownloadIcon } from "@radix-ui/react-icons";
import { IconButton } from "@radix-ui/themes";

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
	const { mutate: downloadResult, isPending } =
		useDownloadWorkflowRunStepResult();

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
