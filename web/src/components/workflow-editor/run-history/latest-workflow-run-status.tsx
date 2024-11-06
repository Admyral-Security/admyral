import { useListWorkflowRunsApi } from "@/hooks/use-list-workflow-runs-api";
import { Flex, Text } from "@radix-ui/themes";
import { useEffect, useState } from "react";
import type { TWorkflowRunMetadata } from "@/types/workflow-runs";
import ErrorCallout from "@/components/utils/error-callout";
import WorkflowRunStatusIndicator from "./workflow-run-status-indicator";

export function WorkflowRunStatus({ workflowId }: { workflowId: string }) {
	const { data, isPending, error } = useListWorkflowRunsApi(workflowId, 1);
	const [latestRun, setLatestRun] = useState<TWorkflowRunMetadata>();

	useEffect(() => {
		if (data) {
			setLatestRun(data[0]);
		}
	}, [data]);

	if (isPending) {
		return <Text size="2">Loading latest run...</Text>;
	}

	if (error) {
		return <ErrorCallout />;
	}

	if (!latestRun) {
		return;
	}

	return (
		<Flex align="center" gap="2" height="25px">
			<WorkflowRunStatusIndicator workflowRun={latestRun} />
		</Flex>
	);
}
