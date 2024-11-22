"use client";

import { useExportWorkflow } from "@/hooks/use-export-workflow";
import { useToast } from "@/providers/toast";
import { DownloadIcon } from "@radix-ui/react-icons";
import { Button } from "@radix-ui/themes";
import { useState } from "react";

export default function ExportWorkflowButton({
	workflowId,
}: {
	workflowId: string;
}) {
	const [isDownloading, setIsDownloading] = useState(false);
	const exportWorkflow = useExportWorkflow();
	const { errorToast } = useToast();

	const handleExport = async () => {
		try {
			setIsDownloading(true);
			await exportWorkflow.mutateAsync({ workflowId });
		} catch (error) {
			errorToast("Failed to export workflow. Please try again.");
		} finally {
			setIsDownloading(false);
		}
	};

	return (
		<Button
			variant="outline"
			style={{ cursor: "pointer" }}
			onClick={handleExport}
			loading={isDownloading}
		>
			Export <DownloadIcon />
		</Button>
	);
}
