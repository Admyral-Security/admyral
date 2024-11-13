import { useListWorkflowRunsApi } from "@/hooks/use-list-workflow-runs-api";
import { Flex } from "@radix-ui/themes";
import { useEffect, useState } from "react";
import type { TWorkflowRunMetadata } from "@/types/workflow-runs";
import WorkflowRunStatusIndicator from "./workflow-run-status-indicator";

export function WorkflowRunStatus({ workflowId }: { workflowId: string }) {
	const { data, isPending, error } = useListWorkflowRunsApi(workflowId, 1);
	const [latestRun, setLatestRun] = useState<TWorkflowRunMetadata>();

	useEffect(() => {
		if (data && data.length > 0) {
			setLatestRun(data[0]);
		}
	}, [data]);

	if (error || isPending || !latestRun) {
		return null;
	}

	return (
		<Flex align="center" gap="2" height="25px">
			<WorkflowRunStatusIndicator workflowRun={latestRun} />
		</Flex>
	);
}
