import ReactFlow, {
	Background,
	BackgroundVariant,
	Controls,
	ReactFlowProvider,
	useStore,
	Node,
} from "reactflow";
import "reactflow/dist/style.css";
import { useCallback, useState } from "react";
import WebhookNode from "./workflow-graph/webhook-node";
import HttpRequestNode from "./workflow-graph/http-request-node";
import DirectedEdgeComponent from "./workflow-graph/edge";
import AiActionNode from "./workflow-graph/ai-action-node";
import SendEmailNode from "./workflow-graph/send-email-node";
import IfConditionNode from "./workflow-graph/if-condition-node";
import ConnectionLine from "./workflow-graph/connection-line";
import WorkflowBuilderRightPanelBase from "./workflow-builder-right-panel-base";
import {
	ActionNode,
	ActionData,
	getActionNodeLabel,
	EdgeType,
} from "@/lib/types";
import Webhook from "./action-editing/webhook";
import HttpRequest from "./action-editing/http-request";
import AiAction from "./action-editing/ai-action";
import IfCondition from "./action-editing/if-condition";
import SendEmail from "./action-editing/send-email";
import { initActionData } from "@/lib/workflows";
import useWorkflowStore from "@/lib/workflow-store";
import EditorSideBar from "./workflow-builder-editor-side-bar";
import ActionNodeIcon from "./action-node-icon";

const nodeTypes = {
	[ActionNode.WEBHOOK]: WebhookNode,
	[ActionNode.HTTP_REQUEST]: HttpRequestNode,
	[ActionNode.AI_ACTION]: AiActionNode,
	[ActionNode.SEND_EMAIL]: SendEmailNode,
	[ActionNode.IF_CONDITION]: IfConditionNode,
};

const edgeTypes = {
	[EdgeType.DEFAULT]: DirectedEdgeComponent,
	[EdgeType.TRUE]: DirectedEdgeComponent,
	[EdgeType.FALSE]: DirectedEdgeComponent,
};

function WorkflowBuilderEditor() {
	const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);

	const {
		nodes,
		edges,
		setNodes,
		onConnect,
		onNodesChange,
		onEdgesChange,
		getId,
	} = useWorkflowStore((state) => ({
		nodes: state.nodes,
		edges: state.edges,
		setNodes: state.setNodes,
		onConnect: state.onConnect,
		onNodesChange: state.onNodesChange,
		onEdgesChange: state.onEdgesChange,
		getId: state.getId,
	}));

	const addSelectedNodes = useStore((store) => store.addSelectedNodes);
	const closeActionDefinitionPanel = () => {
		addSelectedNodes([]);
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

			setNodes([
				...nodes,
				{
					id: nodeId,
					type,
					position,
					data,
					selected: false,
				} as Node<ActionData>,
			]);
		},
		[reactFlowInstance, nodes, setNodes],
	);

	const selectNodeIdx = nodes.findIndex((node) => node.selected);

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
				<Background
					variant={BackgroundVariant.Dots}
					gap={8}
					size={1}
					style={{ backgroundColor: "#FDFDFE" }}
				/>
				<Controls />
			</ReactFlow>

			<EditorSideBar />

			{selectNodeIdx !== -1 && selectNodeIdx < nodes.length && (
				<WorkflowBuilderRightPanelBase
					title={getActionNodeLabel(
						nodes[selectNodeIdx].type as ActionNode,
					)}
					titleIcon={
						<ActionNodeIcon
							actionType={nodes[selectNodeIdx].type as ActionNode}
						/>
					}
					onIconClick={closeActionDefinitionPanel}
					zIndex={100}
				>
					{(nodes[selectNodeIdx].type as ActionNode) ===
						ActionNode.WEBHOOK && (
						<Webhook id={nodes[selectNodeIdx].id} />
					)}

					{(nodes[selectNodeIdx].type as ActionNode) ===
						ActionNode.HTTP_REQUEST && (
						<HttpRequest id={nodes[selectNodeIdx].id} />
					)}

					{(nodes[selectNodeIdx].type as ActionNode) ===
						ActionNode.AI_ACTION && (
						<AiAction id={nodes[selectNodeIdx].id} />
					)}

					{(nodes[selectNodeIdx].type as ActionNode) ===
						ActionNode.IF_CONDITION && (
						<IfCondition id={nodes[selectNodeIdx].id} />
					)}

					{(nodes[selectNodeIdx].type as ActionNode) ===
						ActionNode.SEND_EMAIL && (
						<SendEmail id={nodes[selectNodeIdx].id} />
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
