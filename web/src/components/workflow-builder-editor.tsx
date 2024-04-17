import { Badge, Card, Flex, HoverCard, Text } from "@radix-ui/themes";
import ReactFlow, {
	Background,
	BackgroundVariant,
	Controls,
	useEdgesState,
	useNodesState,
	addEdge,
	MarkerType,
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
import { useCallback, useState } from "react";
import WebhookNode from "./workflow-graph/webhook-node";
import HttpRequestNode from "./workflow-graph/http-request-node";
import ReceiveEmailActionIcon from "./icons/receive-email-action-icon";
import DirectedEdge from "./workflow-graph/edge";
import AiActionNode from "./workflow-graph/ai-action-node";
import SendEmailNode from "./workflow-graph/send-email-node";
import IfConditionNode from "./workflow-graph/if-condition-node";
import ConnectionLine from "./workflow-graph/connection-line";

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
			}}
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
			>
				<Flex direction="column" gap="6">
					<Flex direction="column" gap="4">
						<Text size="3" weight="medium">
							Workflow Actions
						</Text>

						<Flex direction="column" gap="2">
							<div
								onDragStart={(event) =>
									onDragStart(event, "webhook")
								}
								draggable
							>
								<EditorCard
									icon={<WebhookActionIcon />}
									label="Webhook"
								/>
							</div>

							<div
								onDragStart={(event) =>
									onDragStart(event, "httpRequest")
								}
								draggable
							>
								<EditorCard
									icon={<HttpRequestActionIcon />}
									label="HTTP Request"
								/>
							</div>

							<EditorCard
								icon={<TransformActionIcon />}
								label="Transform"
								isComingSoon
							/>

							<div
								onDragStart={(event) =>
									onDragStart(event, "ifCondition")
								}
								draggable
							>
								<EditorCard
									icon={<IfConditionActionIcon />}
									label="If-Condition"
								/>
							</div>

							<div
								onDragStart={(event) =>
									onDragStart(event, "aiAction")
								}
								draggable
							>
								<EditorCard
									icon={<AiActionsIcon />}
									label="AI Action"
								/>
							</div>

							<div
								onDragStart={(event) =>
									onDragStart(event, "sendEmail")
								}
								draggable
							>
								<EditorCard
									icon={<SendEmailActionIcon />}
									label="Send Email"
								/>
							</div>

							<EditorCard
								icon={<ReceiveEmailActionIcon />}
								label="Receive Email"
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
						</Flex>
					</Flex>
				</Flex>

				<WorkflowTemplates />
			</Flex>
		</Card>
	);
}

let id = 0;
const getId = () => `actionnode_${id++}`;

// TODO: make node type keys an enum
const nodeTypes = {
	webhook: WebhookNode,
	httpRequest: HttpRequestNode,
	aiAction: AiActionNode,
	sendEmail: SendEmailNode,
	ifCondition: IfConditionNode,
};

const edgeTypes = {
	edge: DirectedEdge,
};

export interface WorkflowBuilderEditorProps {
	workflowId: string;
}

export default function WorkflowBuilderEditor({
	workflowId,
}: WorkflowBuilderEditorProps) {
	const [nodes, setNodes, onNodesChange] = useNodesState([]);
	const [edges, setEdges, onEdgesChange] = useEdgesState([]);
	const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);

	const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

	const onDragOver = useCallback((event: any) => {
		event.preventDefault();
		event.dataTransfer.dropEffect = "move";
	}, []);

	const onDrop = useCallback(
		(event: any) => {
			event.preventDefault();

			const type = event.dataTransfer.getData("application/reactflow");
			if (typeof type === "undefined" || !type) {
				return;
			}

			const position = reactFlowInstance.screenToFlowPosition({
				x: event.clientX,
				y: event.clientY,
			});

			setNodes((nodes) => {
				const nodeId = getId();
				return [
					...nodes,
					{
						id: nodeId,
						type,
						position,
						data: {
							name: `${type} node`,
							// meta: {
							// 	selectedNodeId,
							// 	onSelect: () => setSelectedNodeId(nodeId),
							// 	onUnselect: () => setSelectedNodeId(null),
							// },
							// actionNode: {
							// 	name: `${type} node`,
							// },
						},
					},
				];
			});
		},
		[reactFlowInstance],
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
		</>
	);
}
