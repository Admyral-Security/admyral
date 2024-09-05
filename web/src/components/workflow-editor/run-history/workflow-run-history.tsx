import { useListWorkflowRunsApi } from "@/hooks/use-list-workflow-runs-api";
import { errorToast } from "@/lib/toast";
import { Box, Flex, Spinner, Text } from "@radix-ui/themes";
import { useEffect, useState } from "react";
import WorkflowRunTrace from "./workflow-run-trace";
import Row from "./row";
import ErrorCallout from "@/components/utils/error-callout";
import { CheckCircledIcon, CrossCircledIcon } from "@radix-ui/react-icons";
import { TWorkflowRunMetadata } from "@/types/workflow-runs";

function WorkflowRunRow({
	workflowRun: { createdAt, failedAt, completedAt },
}: {
	workflowRun: TWorkflowRunMetadata;
}) {
	if (failedAt === null && completedAt === null) {
		// In Progress
		return (
			<Flex align="center" justify="between" width="100%">
				<Text size="1">{createdAt}</Text>
				<Spinner size="1" />
			</Flex>
		);
	}

	if (completedAt === null) {
		// Failure
		return (
			<Flex align="center" justify="between" width="100%">
				<Text size="1">{createdAt}</Text>
				<CrossCircledIcon color="red" />
			</Flex>
		);
	}

	// Success
	return (
		<Flex align="center" justify="between" width="100%">
			<Text size="1">{createdAt}</Text>
			<CheckCircledIcon color="green" />
		</Flex>
	);
}

export default function WorkflowRunHistory({
	workflowId,
}: {
	workflowId: string;
}) {
	const { data, isPending, error } = useListWorkflowRunsApi(workflowId);
	const [selectedRunIdx, setSelectedRunIdx] = useState<number | null>(null);

	useEffect(() => {
		if (data && data.length > 0) {
			setSelectedRunIdx(0);
		}
		if (error) {
			errorToast("Failed to load workflow runs. Please reload the page.");
		}
	}, [data, error]);

	if (isPending) {
		return <Text>Loading...</Text>;
	}

	if (error) {
		return <ErrorCallout />;
	}

	const handleClickRun = (idx: number) => setSelectedRunIdx(idx);

	return (
		<Flex width="100%" height="100%">
			<Box
				height="100%"
				width="200px"
				className="border-r-2 border-r-gray-200"
				style={{ position: "fixed" }}
			>
				<Box
					width="100%"
					height="54px"
					p="16px"
					className="border-b-2 border-b-gray-200"
				>
					<Text size="3" weight="medium">
						Workflow runs
					</Text>
				</Box>

				{data.map((workflowRun, idx) => (
					<Row
						key={`workflow_run_row_${idx}`}
						selected={idx === selectedRunIdx}
						onClickOnUnselectedRow={() => handleClickRun(idx)}
					>
						<WorkflowRunRow workflowRun={workflowRun} />
					</Row>
				))}
			</Box>

			{selectedRunIdx !== null && (
				<WorkflowRunTrace
					workflowId={workflowId}
					workflowRunId={data[selectedRunIdx].runId}
				/>
			)}
		</Flex>
	);
}
