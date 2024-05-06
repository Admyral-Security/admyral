import {
	IF_CONDITION_FALSE_BRANCH_HANDLE_ID,
	IF_CONDITION_TRUE_BRANCH_HANDLE_ID,
} from "@/components/workflow-graph/if-condition-node";
import { generateWorkflow } from "./api";
import { EdgeType, GenerateWorkflowResult } from "./types";
import { initActionData } from "./workflows";
import dagre from "dagre";
import { Edge, MarkerType, Node } from "reactflow";

function computeWorkflowGraphLayout(
	workflow: GenerateWorkflowResult,
): Record<string, { x: number; y: number }> {
	const dagreGraph = new dagre.graphlib.Graph();
	dagreGraph.setDefaultEdgeLabel(() => ({}));
	dagreGraph.setGraph({ rankdir: "TB" }); // vertical layout

	const nodeWidth = 237;
	const nodeHeight = 156; // rough estimate - actually depends on content

	workflow.actions.forEach((action) => {
		dagreGraph.setNode(action.actionId, {
			width: nodeWidth,
			height: nodeHeight,
		});
	});

	workflow.connections.forEach((connection) => {
		dagreGraph.setEdge(connection.source, connection.target);
	});

	dagre.layout(dagreGraph);

	const layout = workflow.actions.reduce(
		(acc, action) => {
			// We are shifting the dagre node position (anchor=center center) to the top left
			// so it matches the React Flow node anchor point (top left).
			const nodePosition = dagreGraph.node(action.actionId);
			acc[action.actionId] = {
				x: nodePosition.x - nodeWidth / 2,
				y: nodePosition.y - nodeHeight / 2,
			};
			return acc;
		},
		{} as Record<string, { x: number; y: number }>,
	);

	return layout;
}

export async function generateWorkflowGraph(
	userInput: string,
): Promise<[Node[], Edge[]]> {
	const generatedWorkflow = await generateWorkflow(userInput);

	const layout = computeWorkflowGraphLayout(generatedWorkflow);

	const nodes = [];
	for (let action of generatedWorkflow.actions) {
		const position = layout[action.actionId];

		const data = await initActionData(
			action.actionType,
			action.actionId,
			action.actionName,
			position.x,
			position.y,
		);

		nodes.push({
			id: action.actionId,
			type: action.actionType,
			position,
			data,
		});
	}

	const edges = generatedWorkflow.connections.map((connection) => {
		let sourceHandle = null;
		if (connection.connectionType === EdgeType.TRUE) {
			sourceHandle = IF_CONDITION_TRUE_BRANCH_HANDLE_ID;
		}
		if (connection.connectionType === EdgeType.FALSE) {
			sourceHandle = IF_CONDITION_FALSE_BRANCH_HANDLE_ID;
		}

		return {
			id: `${connection.source}-${connection.target}`,
			source: connection.source,
			sourceHandle,
			target: connection.target,
			targetHandle: null,
			type: connection.connectionType,
			markerEnd: {
				type: MarkerType.ArrowClosed,
				height: 15,
				width: 15,
				color: "var(--Accent-color-Accent-9, #3E63DD)",
			},
		};
	});

	return [nodes, edges];
}
