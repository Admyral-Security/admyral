"use client";

import { useWorkflowStore } from "@/stores/workflow-store";
import ReactFlow, {
	Background,
	BackgroundVariant,
	Controls,
	ReactFlowProvider,
} from "reactflow";
import { EditorWorkflowNodeType } from "@/types/react-flow";
import DirectedEdgeComponent from "../workflow-graph/edge";
import StartNode from "@/components/workflow-graph/start-node";
import ActionNode from "@/components/workflow-graph/action-node";
import IfConditionNode from "@/components/workflow-graph/if-condition-node";
import { useCallback, useState } from "react";
import { useEditorActionStore } from "@/stores/editor-action-store";
import {
	buildReactFlowActionNode,
	buildReactFlowIfNode,
	buildReactFlowLoopNode,
} from "@/lib/reactflow";
import "reactflow/dist/style.css";
import ConnectionLine from "../workflow-graph/connection-line";
import LoopNode from "../workflow-graph/loop-node";

const nodeTypes = {
	[EditorWorkflowNodeType.START]: StartNode,
	[EditorWorkflowNodeType.ACTION]: ActionNode,
	[EditorWorkflowNodeType.IF_CONDITION]: IfConditionNode,
	[EditorWorkflowNodeType.LOOP]: LoopNode,
};

const edgeTypes = {
	default: DirectedEdgeComponent,
};

export default function WorkflowEditorBuilder() {
	const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);

	const {
		nodes,
		edges,
		onConnect,
		onNodesChange,
		onEdgesChange,
		addNode,
		getNodeId,
	} = useWorkflowStore();
	const { actionsIndex } = useEditorActionStore();

	const onDragOver = useCallback((event: any) => {
		event.preventDefault();
		event.dataTransfer.dropEffect = "move";
	}, []);

	const onDrop = useCallback(
		async (event: any) => {
			event.preventDefault();

			const actionType = event.dataTransfer.getData(
				"application/reactflow",
			);
			if (typeof actionType === "undefined" || !actionType) {
				return;
			}

			const position = reactFlowInstance.screenToFlowPosition({
				x: event.clientX,
				y: event.clientY,
			});

			// generate new node
			const id = getNodeId();
			let newNode;
			switch (actionType) {
				case "if_condition":
					newNode = buildReactFlowIfNode(id, position);
					break;

				case "loop":
					newNode = buildReactFlowLoopNode(id, position);
					break;

				default:
					newNode = buildReactFlowActionNode(
						id,
						position,
						actionType,
					);
			}

			addNode(newNode);
		},
		[reactFlowInstance, addNode, actionsIndex, getNodeId],
	);

	return (
		<ReactFlowProvider>
			<ReactFlow
				proOptions={{ hideAttribution: true }}
				nodes={nodes}
				edges={edges}
				nodeTypes={nodeTypes}
				edgeTypes={edgeTypes}
				onConnect={onConnect}
				onNodesChange={onNodesChange}
				onEdgesChange={onEdgesChange}
				onInit={setReactFlowInstance}
				onDrop={onDrop}
				onDragOver={onDragOver}
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
		</ReactFlowProvider>
	);
}
