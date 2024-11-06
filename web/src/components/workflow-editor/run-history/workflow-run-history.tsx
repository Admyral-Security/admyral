import { useListWorkflowRunsApi } from "@/hooks/use-list-workflow-runs-api";
import { useToast } from "@/providers/toast";
import { Box, Flex, ScrollArea, Text } from "@radix-ui/themes";
import { useEffect, useState } from "react";
import WorkflowRunTrace from "./workflow-run-trace";
import Row from "./row";
import ErrorCallout from "@/components/utils/error-callout";
import { TWorkflowRunMetadata } from "@/types/workflow-runs";
import WorkflowRunStatusIndicator from "./workflow-run-status-indicator";

function WorkflowRunRow({
	workflowRun,
}: {
	workflowRun: TWorkflowRunMetadata;
}) {
	const createdAtAsReadableString = new Date(
		workflowRun.createdAt,
	).toLocaleString("en-US");

	return (
		<Flex align="center" justify="between" width="100%">
			<Text size="1">{createdAtAsReadableString}</Text>
			<WorkflowRunStatusIndicator workflowRun={workflowRun} />
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
	const [runs, setRuns] = useState<TWorkflowRunMetadata[]>([]);
	const { errorToast } = useToast();

	useEffect(() => {
		if (data && data.length > 0) {
			if (runs.length > 0) {
				// TODO: a selected run could get lost because we only return the last 100 runs
				// calculate shift for selectedRunIdx
				const shiftedSelectedRunIdx = data.findIndex(
					(run: TWorkflowRunMetadata) =>
						run.runId === runs[selectedRunIdx!].runId,
				);
				setRuns(data);
				setSelectedRunIdx(
					shiftedSelectedRunIdx !== -1 ? shiftedSelectedRunIdx : 0,
				);
			} else {
				setRuns(data);
				setSelectedRunIdx(0);
			}
		}
		if (error) {
			errorToast("Failed to load workflow runs. Please reload the page.");
		}
	}, [
		data,
		error,
		setRuns,
		setSelectedRunIdx,
		runs,
		selectedRunIdx,
		errorToast,
	]);

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

				<ScrollArea
					type="hover"
					scrollbars="vertical"
					style={{ height: "100%", width: "100%" }}
				>
					<Flex
						direction="column"
						gap="2"
						width="100%"
						height="100%"
						style={{
							display: "flex",
							flexDirection: "column",
						}}
					>
						{runs.map((workflowRun, idx) => (
							<Row
								key={`workflow_run_row_${idx}`}
								selected={idx === selectedRunIdx}
								onClickOnUnselectedRow={() =>
									handleClickRun(idx)
								}
							>
								<WorkflowRunRow workflowRun={workflowRun} />
							</Row>
						))}
					</Flex>
				</ScrollArea>
			</Box>

			{selectedRunIdx !== null && (
				<WorkflowRunTrace
					workflowId={workflowId}
					workflowRunId={runs[selectedRunIdx].runId}
				/>
			)}
		</Flex>
	);
}
