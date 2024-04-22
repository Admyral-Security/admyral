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
	updateWorkflowAndCreateIfNotExists,
} from "@/lib/api";
import TrashIcon from "./icons/trash-icon";
import { DiscIcon } from "@radix-ui/react-icons";
import { ActionNode, ActionData, EdgeData, EdgeType } from "@/lib/types";
import {
	useEdgesState,
	useNodesState,
	Node,
	MarkerType,
	NodeChange,
	EdgeChange,
	NodeRemoveChange,
	EdgeRemoveChange,
} from "reactflow";
import { DirectedEdge } from "./workflow-graph/edge";
import { NEW_MARKER } from "@/lib/workflows";

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

	const actionIdToId = actionNodes.reduce(
		(acc, node) => {
			acc[node.data.actionId as string] = node.id;
			return acc;
		},
		{} as Record<string, string>,
	);

	const edges = edgeData.map((edge) => ({
		id: `${edge.parentActionId}_${edge.childActionId}`,
		source: actionIdToId[edge.parentActionId],
		sourceHandle: edge.parentNodeHandle,
		target: actionIdToId[edge.childActionId],
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

	const [nodes, setNodes, onNodesChange] = useNodesState([]);
	const [edges, setEdges, onEdgesChange] = useEdgesState([]);

	const [deletedNodes, setDeletedNodes] = useState<string[]>([]);
	const [deletedEdges, setDeletedEdges] = useState<[string, string][]>([]);

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
	}, [workflowId, setNodes, setEdges]);

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
				{view === "workflowBuilder" && (
					<WorkflowBuilderEditor
						nodes={nodes}
						setNodes={setNodes}
						onNodesChange={(change: NodeChange[]) => {
							// Track deleted nodes which were already persisted in the DB
							const deletedNodeIds = change
								.filter(
									(c) =>
										c.type === "remove" &&
										!c.id.startsWith(NEW_MARKER),
								)
								.map((c) => (c as NodeRemoveChange).id);
							if (deletedNodeIds.length > 0) {
								setDeletedNodes([
									...deletedNodes,
									...deletedNodeIds,
								]);
							}

							// The usual stuff...
							onNodesChange(change);
						}}
						edges={edges}
						setEdges={setEdges}
						onEdgesChange={(change: EdgeChange[]) => {
							// Track deleted edges which were already persisted in the DB
							const deletedEdgeIds = change
								.filter(
									(c) =>
										c.type === "remove" &&
										!c.id.startsWith(NEW_MARKER),
								)
								.map((c) => (c as EdgeRemoveChange).id);
							if (deletedEdgeIds.length > 0) {
								const deletedEdgeIdsLookup = new Set(
									deletedEdgeIds,
								);
								const newDeletedEdges = edges
									.filter((edge) =>
										deletedEdgeIdsLookup.has(edge.id),
									)
									.map(
										(edge) =>
											[edge.source, edge.target] as [
												string,
												string,
											],
									);
								setDeletedEdges([
									...deletedEdges,
									...newDeletedEdges,
								]);
							}

							// The usual stuff...
							onEdgesChange(change);
						}}
					/>
				)}
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
