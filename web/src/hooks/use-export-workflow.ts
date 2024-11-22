import { useMutation } from "@tanstack/react-query";

export function useExportWorkflow() {
	return useMutation({
		mutationFn: async ({ workflowId }: { workflowId: string }) => {
			const response = await fetch(
				`/api/v1/workflows/export/${workflowId}`,
			);
			if (!response.ok) {
				throw new Error("Failed to export workflow.");
			}

			const blob = await response.blob();
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `${workflowId}.yaml`;
			a.click();
			window.URL.revokeObjectURL(url);
		},
	});
}
