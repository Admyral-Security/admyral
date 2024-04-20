import { Badge, Box, Card, Flex, HoverCard, Text } from "@radix-ui/themes";
import ReactFlow, {
	Background,
	BackgroundVariant,
	Controls,
	addEdge,
	MarkerType,
	useOnSelectionChange,
	ReactFlowProvider,
	useStore,
	Node,
	NodeChange,
	EdgeChange,
} from "reactflow";
import HttpRequestActionIcon from "./icons/http-request-action-icon";
import WebhookActionIcon from "./icons/webhook-action-icon";
import TransformActionIcon from "./icons/transform-action-icon";
import IfConditionActionIcon from "./icons/if-condition-action-icon";
import AiActionsIcon from "./icons/ai-actions-icon";
import SendEmailActionIcon from "./icons/send-email-action-icon";
import CreateCaseIcon from "./icons/create-case-icon";
import UpdateCaseIcon from "./icons/update-case-icon";
import QueryCasesIcon from "./icons/query-cases-icon";
import WorkflowTemplates from "./workflow-templates";
import "reactflow/dist/style.css";
import { Dispatch, SetStateAction, useCallback, useState } from "react";
import WebhookNode from "./workflow-graph/webhook-node";
import HttpRequestNode from "./workflow-graph/http-request-node";
import ReceiveEmailActionIcon from "./icons/receive-email-action-icon";
import DirectedEdgeComponent, { DirectedEdge } from "./workflow-graph/edge";
import AiActionNode from "./workflow-graph/ai-action-node";
import SendEmailNode from "./workflow-graph/send-email-node";
import IfConditionNode from "./workflow-graph/if-condition-node";
import ConnectionLine from "./workflow-graph/connection-line";
import WorkflowBuilderRightPanelBase from "./workflow-builder-right-panel-base";
import {
	ActionNode,
	ActionData,
	getActionNodeLabel,
	SendEmailData,
	IfConditionData,
	AiActionData,
	HttpRequestData,
	WebhookData,
} from "@/lib/types";
import { EnterIcon } from "@radix-ui/react-icons";
import Webhook from "./action-editing/webhook";
import HttpRequest from "./action-editing/http-request";
import AiAction from "./action-editing/ai-action";
import IfCondition from "./action-editing/if-condition";
import SendEmail from "./action-editing/send-email";
import { NEW_MARKER, initActionData } from "@/lib/workflows";
import CaseTriggerIcon from "./icons/case-trigger-icon";

interface EditorCardProps {
	icon: React.ReactNode;
	label: string;
	isComingSoon?: boolean;
}

function EditorCard({ icon, label, isComingSoon = false }: EditorCardProps) {
	if (isComingSoon) {
		return (
			<HoverCard.Root>
				<HoverCard.Trigger>
					<Card
						style={{
							padding: "8px",
							cursor: "pointer",
							width: "95%",
						}}
					>
						<Flex gap="2">
							{icon}
							<Text size="3" weight="medium">
								{label}
							</Text>
						</Flex>
					</Card>
				</HoverCard.Trigger>

				<HoverCard.Content style={{ padding: 0 }}>
					<Badge size="3" color="green">
						Coming soon
					</Badge>
				</HoverCard.Content>
			</HoverCard.Root>
		);
	}

	return (
		<Card
			style={{
				padding: "8px",
				cursor: "pointer",
				width: "95%",
			}}
			draggable
		>
			<Flex gap="2">
				{icon}
				<Text size="3" weight="medium">
					{label}
				</Text>
			</Flex>
		</Card>
	);
}

function EditorSideBar() {
	const onDragStart = (event: any, nodeType: string) => {
		event.dataTransfer.setData("application/reactflow", nodeType);
		event.dataTransfer.effectAllowed = "move";
	};

	return (
		<Card
			style={{
				position: "fixed",
				left: "68px",
				top: "68px",
				zIndex: 50,
				width: "232px",
				backgroundColor: "white",
				height: "calc(99vh - 68px)",
				padding: 0,
			}}
			size="4"
		>
			<Flex
				direction="column"
				justify="between"
				height="100%"
				pt="5"
				pl="4"
				pr="4"
				pb="4"
				style={{
					display: "flex",
					flexDirection: "column",
				}}
			>
				<Flex
					direction="column"
					gap="4"
					height="100%"
					style={{ flex: 1, overflowY: "auto" }}
				>
					<Flex direction="column" gap="3">
						<Text size="3" weight="medium">
							Workflow Actions
						</Text>

						<Flex direction="column" gap="2">
							<div
								onDragStart={(event) =>
									onDragStart(event, ActionNode.WEBHOOK)
								}
							>
								<EditorCard
									icon={<WebhookActionIcon />}
									label={getActionNodeLabel(
										ActionNode.WEBHOOK,
									)}
								/>
							</div>

							<div
								onDragStart={(event) =>
									onDragStart(event, ActionNode.HTTP_REQUEST)
								}
							>
								<EditorCard
									icon={<HttpRequestActionIcon />}
									label={getActionNodeLabel(
										ActionNode.HTTP_REQUEST,
									)}
								/>
							</div>

							<EditorCard
								icon={<TransformActionIcon />}
								label={getActionNodeLabel(ActionNode.TRANSFORM)}
								isComingSoon
							/>

							<div
								onDragStart={(event) =>
									onDragStart(event, ActionNode.IF_CONDITION)
								}
							>
								<EditorCard
									icon={<IfConditionActionIcon />}
									label={getActionNodeLabel(
										ActionNode.IF_CONDITION,
									)}
									isComingSoon
								/>
							</div>

							<div
								onDragStart={(event) =>
									onDragStart(event, ActionNode.AI_ACTION)
								}
							>
								<EditorCard
									icon={<AiActionsIcon />}
									label={getActionNodeLabel(
										ActionNode.AI_ACTION,
									)}
									isComingSoon
								/>
							</div>

							<div
								onDragStart={(event) =>
									onDragStart(event, ActionNode.SEND_EMAIL)
								}
							>
								<EditorCard
									icon={<SendEmailActionIcon />}
									label={getActionNodeLabel(
										ActionNode.SEND_EMAIL,
									)}
									isComingSoon
								/>
							</div>

							<EditorCard
								icon={<ReceiveEmailActionIcon />}
								label={getActionNodeLabel(
									ActionNode.RECEIVE_EMAIL,
								)}
								isComingSoon
							/>
						</Flex>
					</Flex>

					<Flex direction="column" gap="4">
						<Text size="3" weight="medium">
							Case Actions
						</Text>

						<Flex direction="column" gap="2">
							<EditorCard
								icon={<CreateCaseIcon />}
								label="Create Case"
								isComingSoon
							/>

							<EditorCard
								icon={<UpdateCaseIcon />}
								label="Update Case"
								isComingSoon
							/>

							<EditorCard
								icon={<QueryCasesIcon />}
								label="Query Cases"
								isComingSoon
							/>

							<EditorCard
								icon={<CaseTriggerIcon />}
								label="Case Trigger"
								isComingSoon
							/>
						</Flex>
					</Flex>

					<Flex direction="column" gap="4">
						<Text size="3" weight="medium">
							Integrations
						</Text>

						<Flex direction="column" gap="2">
							<EditorCard
								icon={<EnterIcon width="24" height="24" />}
								label="Coming soon"
								isComingSoon
							/>
						</Flex>
					</Flex>
				</Flex>

				<Box pt="4" width="95%">
					<WorkflowTemplates />
				</Box>
			</Flex>
		</Card>
	);
}

let id = 0;
const getId = () => `${NEW_MARKER}workflow_obj_${id++}`;

function actionNodeTypeToIcon(actionNode: ActionNode) {
	switch (actionNode) {
		case ActionNode.WEBHOOK:
			return <WebhookActionIcon />;
		case ActionNode.HTTP_REQUEST:
			return <HttpRequestActionIcon />;
		case ActionNode.TRANSFORM:
			return <TransformActionIcon />;
		case ActionNode.IF_CONDITION:
			return <IfConditionActionIcon />;
		case ActionNode.AI_ACTION:
			return <AiActionsIcon />;
		case ActionNode.SEND_EMAIL:
			return <SendEmailActionIcon />;
		case ActionNode.RECEIVE_EMAIL:
			return <ReceiveEmailActionIcon />;
		default:
			return null;
	}
}

const nodeTypes = {
	[ActionNode.WEBHOOK]: WebhookNode,
	[ActionNode.HTTP_REQUEST]: HttpRequestNode,
	[ActionNode.AI_ACTION]: AiActionNode,
	[ActionNode.SEND_EMAIL]: SendEmailNode,
	[ActionNode.IF_CONDITION]: IfConditionNode,
};

const edgeTypes = {
	edge: DirectedEdgeComponent,
};

export interface WorkflowBuilderEditorProps {
	nodes: Node<ActionData>[];
	setNodes: Dispatch<SetStateAction<Node<ActionData>[]>>;
	onNodesChange: (changes: NodeChange[]) => void;
	edges: DirectedEdge[];
	setEdges: Dispatch<SetStateAction<DirectedEdge[]>>;
	onEdgesChange: (changes: EdgeChange[]) => void;
}

function WorkflowBuilderEditor({
	nodes,
	setNodes,
	onNodesChange,
	edges,
	setEdges,
	onEdgesChange,
}: WorkflowBuilderEditorProps) {
	const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);

	// Node selection management
	const addSelectedNodes = useStore((store) => store.addSelectedNodes);
	const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
	useOnSelectionChange({
		onChange: ({ nodes, edges }) => {
			if (nodes.length === 0) {
				setSelectedNodeId(null);
			} else {
				setSelectedNodeId(nodes[0].id as string);
			}
		},
	});

	const closeActionDefinitionPanel = () => {
		addSelectedNodes([]);
		setSelectedNodeId(null);
	};

	const onDragOver = useCallback((event: any) => {
		event.preventDefault();
		event.dataTransfer.dropEffect = "move";
	}, []);

	const onDrop = useCallback(
		async (event: any) => {
			event.preventDefault();

			const type = event.dataTransfer.getData("application/reactflow");
			if (typeof type === "undefined" || !type) {
				return;
			}

			const position = reactFlowInstance.screenToFlowPosition({
				x: event.clientX,
				y: event.clientY,
			});

			// Generate a unique action name
			let actionName = getActionNodeLabel(type as ActionNode);
			const nodeNames = new Set(
				nodes.map((node) => node.data.actionName),
			);
			if (nodeNames.has(actionName)) {
				for (let i = 0; i < nodes.length + 1; i++) {
					let testActionName = `${actionName} (${i + 1})`;
					if (!nodeNames.has(actionName)) {
						actionName = testActionName;
						break;
					}
				}
			}

			const nodeId = getId();
			const data = await initActionData(
				type as ActionNode,
				nodeId,
				actionName,
				position.x,
				position.y,
			);

			setNodes((nodes) => {
				return [
					...nodes,
					{
						id: nodeId,
						type,
						position,
						data,
					},
				];
			});
		},
		[reactFlowInstance, nodes, setNodes],
	);

	const onConnect = useCallback(
		(connection: any) => {
			const edge = {
				...connection,
				type: "edge",
				markerEnd: {
					type: MarkerType.ArrowClosed,
					height: 15,
					width: 15,
					color: "var(--Accent-color-Accent-9, #3E63DD)",
				},
			};

			setEdges((eds) => addEdge(edge, eds));
		},
		[setEdges],
	);

	const selectNodeIdx = nodes.findIndex((node) => node.id === selectedNodeId);

	const updateData = (data: ActionData) => {
		setNodes((nodes) =>
			nodes.map((node) => {
				if (node.id === selectedNodeId) {
					return {
						...node,
						data,
					};
				}
				return node;
			}),
		);
	};

	return (
		<>
			<ReactFlow
				proOptions={{ hideAttribution: true }}
				nodes={nodes}
				edges={edges}
				onConnect={onConnect}
				onNodesChange={onNodesChange}
				onEdgesChange={onEdgesChange}
				onInit={setReactFlowInstance}
				onDrop={onDrop}
				onDragOver={onDragOver}
				nodeTypes={nodeTypes}
				edgeTypes={edgeTypes}
				connectionLineComponent={ConnectionLine}
			>
				<Background variant={BackgroundVariant.Dots} gap={8} size={1} />
				<Controls />
			</ReactFlow>

			<EditorSideBar />

			{selectNodeIdx !== -1 && selectNodeIdx < nodes.length && (
				<WorkflowBuilderRightPanelBase
					title={getActionNodeLabel(
						nodes[selectNodeIdx].type as ActionNode,
					)}
					titleIcon={actionNodeTypeToIcon(
						nodes[selectNodeIdx].type as ActionNode,
					)}
					onIconClick={closeActionDefinitionPanel}
					zIndex={100}
				>
					{(nodes[selectNodeIdx].type as ActionNode) ===
						ActionNode.WEBHOOK && (
						<Webhook
							data={nodes[selectNodeIdx].data as WebhookData}
							updateData={updateData}
						/>
					)}

					{(nodes[selectNodeIdx].type as ActionNode) ===
						ActionNode.HTTP_REQUEST && (
						<HttpRequest
							data={nodes[selectNodeIdx].data as HttpRequestData}
							updateData={updateData}
						/>
					)}

					{(nodes[selectNodeIdx].type as ActionNode) ===
						ActionNode.AI_ACTION && (
						<AiAction
							data={nodes[selectNodeIdx].data as AiActionData}
							updateData={updateData}
						/>
					)}

					{(nodes[selectNodeIdx].type as ActionNode) ===
						ActionNode.IF_CONDITION && (
						<IfCondition
							data={nodes[selectNodeIdx].data as IfConditionData}
							updateData={updateData}
						/>
					)}

					{(nodes[selectNodeIdx].type as ActionNode) ===
						ActionNode.SEND_EMAIL && (
						<SendEmail
							data={nodes[selectNodeIdx].data as SendEmailData}
							updateData={updateData}
						/>
					)}
				</WorkflowBuilderRightPanelBase>
			)}
		</>
	);
}

export default function WorkflowBuilderEditorWrapper({ ...props }: any) {
	return (
		<ReactFlowProvider>
			<WorkflowBuilderEditor {...props} />
		</ReactFlowProvider>
	);
}
