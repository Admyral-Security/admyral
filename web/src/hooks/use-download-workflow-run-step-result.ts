import { useMutation } from "@tanstack/react-query";

export function useDownloadWorkflowRunStepResult() {
	return useMutation({
		mutationFn: async ({
			workflowId,
			runId,
			stepId,
		}: {
			workflowId: string;
			runId: string;
			stepId: string;
		}) => {
			const response = await fetch(
				`/api/v1/runs/${workflowId}/${runId}/${stepId}/download`,
			);

			if (!response.ok) {
				throw new Error("Result download failed!");
			}

			const blob = await response.blob();
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `step_result_${stepId}.json`;
			a.click();
			window.URL.revokeObjectURL(url);
		},
	});
}
