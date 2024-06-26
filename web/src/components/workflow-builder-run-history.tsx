import { loadWorkflowRunEvents, loadWorkflowRuns } from "@/lib/api";
import { ActionNode, WorkflowRun, WorkflowRunEvent } from "@/lib/types";
import { IntegrationType } from "@/lib/integrations";
import { Badge, Box, Callout, Card, Flex, Text } from "@radix-ui/themes";
import { useEffect, useState } from "react";
import "@/components/workflow-builder-run-history.css";
import ActionNodeIcon from "./action-node-icon";
import Image from "next/image";
import IntegrationLogoIcon from "./integration-logo-icon";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import { errorToast } from "@/lib/toast";

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

function ActionIcon({
	actionType,
	actionDefinition,
}: {
	actionType: ActionNode;
	actionDefinition: any;
}) {
	if (actionType !== ActionNode.INTEGRATION) {
		return <ActionNodeIcon actionType={actionType} />;
	}
	const integrationType = (actionDefinition as any)
		.integrationType as IntegrationType;
	return <IntegrationLogoIcon integration={integrationType} />;
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
				<Flex justify="between" align="center" width="100%">
					<Flex gap="4" justify="start" align="center">
						<ActionIcon
							actionType={event.actionType}
							actionDefinition={event.actionDefinition}
						/>
						<Text size="3" weight="medium">
							{event.actionName}
						</Text>
					</Flex>

					{event.isError && (
						<Image
							src="/error_icon.svg"
							alt="Error"
							height="16"
							width="16"
						/>
					)}
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

function WorkflowRunError({ error }: { error: string }) {
	return (
		<Callout.Root color="red">
			<Flex align="center" gap="5">
				<Callout.Icon>
					<InfoCircledIcon width="20" height="20" />
				</Callout.Icon>
				<Callout.Text size="2">{error}</Callout.Text>
			</Flex>
		</Callout.Root>
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

	const [selectedWorkflowRunError, setSelectedWorkflowRunError] = useState<
		string | null
	>(null);

	const [trace, setTrace] = useState<WorkflowRunEvent[] | null>(null);

	useEffect(() => {
		loadWorkflowRuns(workflowId)
			.then((workflowRuns) => {
				setWorkflowRuns(workflowRuns);
			})
			.catch((error) => {
				errorToast(
					"Failed to load workflow runs. Please refresh the site.",
				);
			});
	}, [workflowId]);

	const handleSelectWorkflowRun = async (workflowRunId: string) => {
		setSelectedWorkflowRunId(workflowRunId);

		setWorkflowRunEvents([]);
		setSelectedWorkflowRunEventId(null);
		setTrace(null);
		setSelectedWorkflowRunError(null);

		// We check whether there was an error for starting the workflow.
		const idx = workflowRuns.findIndex(
			(workflowRun) => workflowRun.runId === workflowRunId,
		);
		if (workflowRuns[idx].error !== null) {
			setSelectedWorkflowRunError(workflowRuns[idx].error);
			return;
		}

		try {
			const workflowRunEvents = await loadWorkflowRunEvents(
				workflowId,
				workflowRunId,
			);

			setWorkflowRunEvents(workflowRunEvents);
		} catch (err) {
			setSelectedWorkflowRunId(null);
			errorToast("Failed to load workflow run events. Please try again.");
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
									justify="between"
									width="100%"
									gap="4"
								>
									<Flex
										align="center"
										justify="start"
										gap="2"
									>
										<ActionIcon
											actionType={
												workflowRunEvent.actionType
											}
											actionDefinition={
												workflowRunEvent.actionDefinition
											}
										/>
										<Text size="2">
											{workflowRunEvent.actionName}
										</Text>
									</Flex>

									{workflowRunEvent.isError && (
										<Image
											src="/error_icon.svg"
											alt="Error"
											height="16"
											width="16"
										/>
									)}
								</Flex>
							</Row>
						),
					)}
				</Flex>
			</Box>

			<Box
				height="100%"
				width="calc(100vw - 546px)"
				left="546px"
				className="border-r-2 border-r-gray-200"
				style={{ position: "fixed" }}
			>
				{selectedWorkflowRunError !== null && (
					<Flex
						justify="center"
						align="center"
						width="100%"
						height="100%"
						p="2"
					>
						<WorkflowRunError error={selectedWorkflowRunError} />
					</Flex>
				)}
				{selectedWorkflowRunEventId === null &&
					selectedWorkflowRunError === null && (
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
					)}
				{selectedWorkflowRunEventId !== null &&
					selectedWorkflowRunError === null && (
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
