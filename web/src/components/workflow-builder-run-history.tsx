import { loadWorkflowRunEvents, loadWorkflowRuns } from "@/lib/api";
import { WorkflowRun, WorkflowRunEvent } from "@/lib/types";
import { Badge, Box, Card, Flex, Text } from "@radix-ui/themes";
import { useEffect, useState } from "react";
import "@/components/workflow-builder-run-history.css";
import ActionNodeIcon from "./action-node-icon";

const MONTHS = [
	"Jan",
	"Feb",
	"Mar",
	"Apr",
	"May",
	"Jun",
	"Jul",
	"Aug",
	"Sep",
	"Oct",
	"Nov",
	"Dec",
];

function getDateString(date: string) {
	const parsedDate = new Date(date);
	const time = parsedDate.toLocaleString("en-US", {
		hour: "numeric",
		minute: "numeric",
		hour12: true,
	});
	return `${MONTHS[parsedDate.getMonth()]} ${parsedDate.getDate()}, ${time}`;
}

function computeTrace(
	events: WorkflowRunEvent[],
	destinationId: string,
): WorkflowRunEvent[] {
	const idToEvent = {} as Record<string, WorkflowRunEvent>;
	events.forEach((event) => {
		idToEvent[event.actionStateId] = event;
	});

	// Follow path from destination to the very first action by following the prevActionStateId (=== parent action state) field.
	const trace = [idToEvent[destinationId]] as WorkflowRunEvent[];
	while (trace[trace.length - 1].prevActionStateId !== null) {
		const prevEvent = idToEvent[trace[trace.length - 1].prevActionStateId!];
		trace.push(prevEvent);
	}

	return trace.reverse();
}

interface RowProps {
	children: React.ReactNode;
	selected: boolean;
	onClickOnUnselectedRow: () => void;
}

function Row({ children, selected, onClickOnUnselectedRow }: RowProps) {
	if (selected) {
		return (
			<Flex
				px="16px"
				py="2"
				style={{
					backgroundColor:
						"var(--Neutral-color-Neutral-Alpha-4, rgba(2, 2, 52, 0.08))",
				}}
			>
				{children}
			</Flex>
		);
	}

	return (
		<Flex
			px="16px"
			py="2"
			style={{
				cursor: "pointer",
			}}
			className="row"
			onClick={onClickOnUnselectedRow}
		>
			{children}
		</Flex>
	);
}

function TraceEvent({ event }: { event: WorkflowRunEvent }) {
	return (
		<Flex direction="column" gap="1" width="100%">
			<Card>
				<Flex gap="4" justify="start" align="center">
					<ActionNodeIcon actionType={event.actionType} />
					<Text size="3" weight="medium">
						{" "}
						{event.actionName}
					</Text>
				</Flex>
			</Card>

			<Card>
				<Flex direction="column" gap="2">
					<Text size="3" weight="medium">
						ID {event.actionStateId}
					</Text>

					<Text size="2">{getDateString(event.createdAt)}</Text>

					<Card
						style={{
							backgroundColor:
								"var(--Neutral-color-Neutral-Alpha-2, rgba(5, 5, 88, 0.02)",
							padding: "8px",
							color: "#3E63DD",
						}}
					>
						<Flex style={{ width: "100%" }}>
							<pre
								style={{
									// whiteSpace: "pre-wrap",
									overflowX: "auto",
								}}
							>
								{JSON.stringify(event.actionState, null, 4)}
							</pre>
						</Flex>
					</Card>
				</Flex>
			</Card>
		</Flex>
	);
}

export interface WorkflowBuilderRunHistoryProps {
	workflowId: string;
}

export default function WorkflowBuilderRunHistory({
	workflowId,
}: WorkflowBuilderRunHistoryProps) {
	const [workflowRuns, setWorkflowRuns] = useState<WorkflowRun[]>([]);
	const [selectedWorkflowRunId, setSelectedWorkflowRunId] = useState<
		string | null
	>(null);

	const [workflowRunEvents, setWorkflowRunEvents] = useState<
		WorkflowRunEvent[]
	>([]);
	const [selectedWorkflowRunEventId, setSelectedWorkflowRunEventId] =
		useState<string | null>(null);

	const [trace, setTrace] = useState<WorkflowRunEvent[] | null>(null);

	useEffect(() => {
		loadWorkflowRuns(workflowId)
			.then((workflowRuns) => {
				setWorkflowRuns(workflowRuns);
			})
			.catch((error) => {
				alert(
					"Failed to load workflow runs. Please try again by refreshing the site.",
				);
			});
	}, [workflowId]);

	const handleSelectWorkflowRun = async (workflowRunId: string) => {
		setSelectedWorkflowRunId(workflowRunId);

		setWorkflowRunEvents([]);
		setSelectedWorkflowRunEventId(null);
		setTrace(null);

		try {
			const workflowRunEvents = await loadWorkflowRunEvents(
				workflowId,
				workflowRunId,
			);

			setWorkflowRunEvents(workflowRunEvents);
		} catch (err) {
			setSelectedWorkflowRunId(null);
			alert("Failed to load workflow run events! Please try again.");
		}
	};

	const handleSelectWorkflowRunEvent = (workflowRunEventId: string) => {
		setSelectedWorkflowRunEventId(workflowRunEventId);

		const trace = computeTrace(workflowRunEvents, workflowRunEventId);
		setTrace(trace);
	};

	return (
		<Flex direction="row" height="100%" width="100%">
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

				<Flex
					direction="column"
					// height="100%"
					height="calc(100vh - 54px - 56px)"
					style={{ flex: 1, overflowY: "auto" }}
				>
					{workflowRuns.map(
						(workflowRun: WorkflowRun, idx: number) => (
							<Row
								key={`workflow_run_row_${idx}`}
								selected={
									selectedWorkflowRunId === workflowRun.runId
								}
								onClickOnUnselectedRow={() =>
									handleSelectWorkflowRun(workflowRun.runId)
								}
							>
								<Flex
									align="center"
									justify="between"
									width="100%"
								>
									<Text size="2">
										{getDateString(workflowRun.startedAt)}
									</Text>
									<Badge size="2" color="gray">
										{workflowRun.actionStateCount}
									</Badge>
								</Flex>
							</Row>
						),
					)}
				</Flex>
			</Box>

			<Box
				// height="calc(100vh - 140px)"
				height="100%"
				width="290px"
				left="256px"
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
						Events
					</Text>
				</Box>

				<Flex
					direction="column"
					// height="100%"
					height="calc(100vh - 54px - 56px)"
					style={{ flex: 1, overflowY: "auto" }}
				>
					{workflowRunEvents.map(
						(workflowRunEvent: WorkflowRunEvent, idx: number) => (
							<Row
								key={`workflow_run_event_row_${idx}`}
								selected={
									workflowRunEvent.actionStateId ===
									selectedWorkflowRunEventId
								}
								onClickOnUnselectedRow={() =>
									handleSelectWorkflowRunEvent(
										workflowRunEvent.actionStateId,
									)
								}
							>
								<Flex
									align="center"
									justify="start"
									width="100%"
									gap="4"
								>
									<ActionNodeIcon
										actionType={workflowRunEvent.actionType}
									/>
									<Text size="2">
										{workflowRunEvent.actionName}
									</Text>
								</Flex>
							</Row>
						),
					)}
				</Flex>
			</Box>

			<Box
				// height="calc(100vh - 140px)"
				height="100%"
				width="calc(100vw - 546px)"
				left="546px"
				className="border-r-2 border-r-gray-200"
				style={{ position: "fixed" }}
			>
				{selectedWorkflowRunEventId === null ? (
					<Flex
						justify="center"
						align="center"
						width="100%"
						height="100%"
					>
						<Text size="4" weight="medium">
							No event selected.
						</Text>
					</Flex>
				) : (
					<>
						<Box
							width="100%"
							height="54px"
							p="16px"
							className="border-b-2 border-b-gray-200"
						>
							<Text size="3" weight="medium">
								Trace to event {selectedWorkflowRunEventId}
							</Text>
						</Box>

						<Flex
							mt="16px"
							px="4"
							direction="column"
							gap="4"
							height="calc(100vh - 54px - 56px - 16px)"
							width="90%"
							style={{ flex: 1, overflowY: "auto" }}
						>
							{trace !== null && (
								<>
									{trace.map((event, idx) => (
										<TraceEvent
											key={`trace_event_${idx}`}
											event={event}
										/>
									))}
								</>
							)}
						</Flex>
					</>
				)}
			</Box>
		</Flex>
	);
}
