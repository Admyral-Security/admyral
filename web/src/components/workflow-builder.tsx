"use client";

import {
	AlertDialog,
	Box,
	Button,
	Flex,
	Grid,
	Tabs,
	Text,
	TextArea,
	TextField,
} from "@radix-ui/themes";
import { useEffect, useState } from "react";
import PublishWorkflowToggle from "./publish-workflow-toggle";
import SettingsIcon from "./icons/settings-icon";
import WorkflowBuilderEditor from "./workflow-builder-editor";
import WorkflowBuilderRunHistory from "./workflow-builder-run-history";
import WorkflowBuilderRightPanelBase from "./workflow-builder-right-panel-base";
import {
	deleteWorkflow,
	getWorkflow,
	triggerWorkflowFromAction,
	updateWorkflowAndCreateIfNotExists,
} from "@/lib/api";
import TrashIcon from "./icons/trash-icon";
import { DiscIcon } from "@radix-ui/react-icons";
import { ActionNode, ActionData, EdgeData, EdgeType } from "@/lib/types";
import { Node, MarkerType } from "reactflow";
import { DirectedEdge } from "./workflow-graph/edge";
import useWorkflowStore from "@/lib/workflow-store";

function buildInitialWorkflowGraph(
	actionData: ActionData[],
	edgeData: EdgeData[],
): [Node<ActionData>[], DirectedEdge[]] {
	const actionNodes = actionData.map((action) => ({
		id: action.actionId,
		type: action.actionType as ActionNode,
		position: {
			x: action.xPosition,
			y: action.yPosition,
		},
		data: action,
	}));

	const edges = edgeData.map((edge) => ({
		id: `${edge.parentActionId}_${edge.childActionId}`,
		source: edge.parentActionId,
		sourceHandle: edge.parentNodeHandle,
		target: edge.childActionId,
		targetHandle: edge.childNodeHandle,
		type: edge.edgeType,
		markerEnd: {
			type: MarkerType.ArrowClosed,
			height: 15,
			width: 15,
			color: "var(--Accent-color-Accent-9, #3E63DD)",
		},
	}));

	return [actionNodes, edges];
}

export interface WorkflowBuilderProps {
	workflowId: string;
}

type View = "workflowBuilder" | "runHistory";

export default function WorkflowBuilder({ workflowId }: WorkflowBuilderProps) {
	const [view, setView] = useState<View>("workflowBuilder");
	const [workflowData, setWorkflowData] = useState({
		workflowName: "",
		workflowDescription: "",
		isLive: false,
	});

	const {
		nodes,
		deletedNodes,
		deletedEdges,
		edges,
		setNodes,
		setEdges,
		setDeletedNodes,
		setDeletedEdges,
		clearWorkflowState,
		triggerNodeId,
		setTriggerNodeId,
		hasUnsavedChanges,
	} = useWorkflowStore((state) => ({
		nodes: state.nodes,
		deletedNodes: state.deletedNodes,
		edges: state.edges,
		deletedEdges: state.deletedEdges,
		setNodes: state.setNodes,
		setEdges: state.setEdges,
		setDeletedNodes: state.setDeletedNodes,
		setDeletedEdges: state.setDeletedEdges,
		clearWorkflowState: state.clear,
		triggerNodeId: state.triggerNodeId,
		setTriggerNodeId: state.setTriggerNodeId,
		hasUnsavedChanges: state.hasUnsavedChanges,
	}));

	const [isSavingWorkflow, setIsSavingWorkflow] = useState<boolean>(false);
	const [isDeletingWorkflow, setIsDeletingWorkflow] =
		useState<boolean>(false);

	const [openSettings, setOpenSettings] = useState<boolean>(false);

	useEffect(() => {
		getWorkflow(workflowId)
			.then((workflow) => {
				setWorkflowData({
					workflowName: workflow.workflowName,
					workflowDescription: workflow.workflowDescription,
					isLive: workflow.isLive,
				});

				setDeletedNodes([]);
				setDeletedEdges([]);

				const [n, e] = buildInitialWorkflowGraph(
					workflow.actions,
					workflow.edges,
				);
				setNodes(n);
				setEdges(e);
			})
			.catch((error) => {
				alert(
					"Failed to fetch workflow. Please try to refresh the page",
				);
			});
		return () => clearWorkflowState();
	}, [workflowId, setNodes, setEdges]);

	useEffect(() => {
		if (triggerNodeId === null) {
			return;
		}

		setTriggerNodeId(null);

		if (hasUnsavedChanges()) {
			alert(
				"There are unsaved changes. Please save the workflow before running it.",
			);
			return;
		}

		triggerWorkflowFromAction(workflowId, triggerNodeId)
			.then(() => {
				alert("Workflow triggered successfully.");
			})
			.catch((error) => {
				alert("Failed to trigger workflow. Please try again.");
			});
	}, [triggerNodeId, setTriggerNodeId]);

	const handleDeleteWorkflow = async () => {
		setIsDeletingWorkflow(true);
		try {
			await deleteWorkflow(workflowId);
		} catch (error) {
			alert("Failed to delete workflow. ");
		} finally {
			setIsDeletingWorkflow(false);
		}
	};

	const handleSaveWorkflow = async () => {
		setIsSavingWorkflow(true);

		const actions = nodes.map((node) => ({
			...node.data,
			xPosition: node.position.x,
			yPosition: node.position.y,
		}));
		const idToActionId = nodes.reduce(
			(acc, node) => {
				acc[node.id] = node.data.actionId;
				return acc;
			},
			{} as Record<string, string>,
		);

		const workflowUpdate = {
			...workflowData,
			actions,
			edges: edges.map((edge) => ({
				parentActionId: idToActionId[edge.source],
				parentNodeHandle: edge.sourceHandle,
				childActionId: idToActionId[edge.target],
				childNodeHandle: edge.targetHandle,
				edgeType: edge.type as EdgeType,
			})),
		};

		try {
			const update = await updateWorkflowAndCreateIfNotExists(
				workflowId,
				workflowUpdate,
				deletedNodes,
				deletedEdges,
			);

			// Clear the deleted nodes and edges
			setDeletedEdges([]);
			setDeletedNodes([]);

			// Update the entire state - this is required because the action IDs might have changed
			// (from temporary IDs to actual IDs)
			const [n, e] = buildInitialWorkflowGraph(
				update.actions,
				update.edges,
			);
			setNodes(n);
			setEdges(e);

			setWorkflowData({
				workflowName: update.workflowName,
				workflowDescription: update.workflowDescription,
				isLive: update.isLive,
			});
		} catch (error) {
			alert("Failed to save workflow. Please try again.");
		} finally {
			setIsSavingWorkflow(false);
		}
	};

	return (
		<Grid rows="50px 1fr" width="auto" height="100%" align="center">
			<Box width="100%" height="100%">
				<Grid
					pb="2"
					pt="2"
					pl="4"
					pr="4"
					columns="3"
					className="border-b-2 border-gray-200"
					align="center"
					height="56px"
					width="calc(100% - 56px)"
					style={{
						position: "fixed",
						backgroundColor: "white",
						zIndex: 100,
					}}
				>
					<Flex justify="start" align="center" gap="4">
						<Text size="4" weight="medium">
							Workflow Builder
						</Text>

						<Text size="4" color="gray">
							{workflowData.workflowName}
						</Text>
					</Flex>

					<Flex justify="center" align="center">
						<Tabs.Root
							value={view}
							onValueChange={(page) => setView(page as View)}
						>
							<Tabs.List size="1">
								<Tabs.Trigger
									value="workflowBuilder"
									style={{ cursor: "pointer" }}
								>
									Workflow Builder
								</Tabs.Trigger>
								<Tabs.Trigger
									value="runHistory"
									style={{ cursor: "pointer" }}
								>
									Run History
								</Tabs.Trigger>
							</Tabs.List>
						</Tabs.Root>
					</Flex>

					<Flex justify="end" align="center" gap="3">
						<Button
							variant="solid"
							size="2"
							onClick={handleSaveWorkflow}
							style={{
								cursor: "pointer",
							}}
							loading={isSavingWorkflow}
						>
							<DiscIcon />
							Save Workflow
						</Button>

						<Button
							variant="soft"
							size="2"
							onClick={() => setOpenSettings(!openSettings)}
							style={{
								cursor: "pointer",
								color: "var(--Neutral-color-Neutral-11, #60646C)",
								backgroundColor:
									"var(--Neutral-color-Neutral-Alpha-3, rgba(0, 0, 59, 0.05))",
							}}
						>
							<SettingsIcon color="#60646C" />
							Settings
						</Button>

						<Box width="105px">
							<PublishWorkflowToggle
								workflowId={workflowId}
								isLive={workflowData.isLive}
								onSuccess={() =>
									setWorkflowData({
										...workflowData,
										isLive: !workflowData.isLive,
									})
								}
								onError={() => {
									if (workflowData.isLive) {
										alert("Failed to deactivate workflow");
									} else {
										alert("Failed to activate workflow");
									}
								}}
							/>
						</Box>
					</Flex>
				</Grid>
			</Box>

			<Box height="100%" width="100%">
				{view === "workflowBuilder" && <WorkflowBuilderEditor />}
				{view === "runHistory" && <WorkflowBuilderRunHistory />}
			</Box>

			{openSettings && (
				<WorkflowBuilderRightPanelBase
					title="Workflow Settings"
					titleIcon={<SettingsIcon color="#1C2024" />}
					onIconClick={() => setOpenSettings(false)}
				>
					<Flex direction="column" gap="4" p="4">
						<Flex direction="column" gap="2">
							<Text>Workflow Name</Text>
							<TextField.Root
								variant="surface"
								value={workflowData.workflowName}
								onChange={(event) =>
									setWorkflowData({
										...workflowData,
										workflowName: event.target.value,
									})
								}
							/>
						</Flex>

						<Flex direction="column" gap="2">
							<Text>Workflow Description</Text>
							<TextArea
								size="2"
								variant="surface"
								resize="vertical"
								value={workflowData.workflowDescription}
								onChange={(event) =>
									setWorkflowData({
										...workflowData,
										workflowDescription: event.target.value,
									})
								}
							/>
						</Flex>

						<Box width="auto">
							<AlertDialog.Root>
								<AlertDialog.Trigger>
									<Button
										style={{ cursor: "pointer" }}
										variant="soft"
										color="red"
										loading={isDeletingWorkflow}
									>
										<TrashIcon color="#e5484d" />
										Delete Workflow
									</Button>
								</AlertDialog.Trigger>

								<AlertDialog.Content>
									<AlertDialog.Title>
										Delete Workflow
									</AlertDialog.Title>
									<AlertDialog.Description size="2">
										Do you want to delete this workflow?
										This action cannot be undone.
									</AlertDialog.Description>

									<Flex gap="3" mt="4" justify="end">
										<AlertDialog.Cancel>
											<Button
												variant="soft"
												color="gray"
												style={{ cursor: "pointer" }}
											>
												Cancel
											</Button>
										</AlertDialog.Cancel>
										<AlertDialog.Action>
											<Button
												loading={isDeletingWorkflow}
												variant="solid"
												color="red"
												style={{ cursor: "pointer" }}
												onClick={handleDeleteWorkflow}
											>
												Delete Worfklow
											</Button>
										</AlertDialog.Action>
									</Flex>
								</AlertDialog.Content>
							</AlertDialog.Root>
						</Box>
					</Flex>
				</WorkflowBuilderRightPanelBase>
			)}
		</Grid>
	);
}
