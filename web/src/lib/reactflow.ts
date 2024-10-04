import { TActionMetadata } from "@/types/editor-actions";
import {
	TEditorWorkflowGraph,
	TReactFlowNode,
	TReactFlowEdge,
	TReactFlowGraph,
	EditorWorkflowNodeType,
} from "@/types/react-flow";
import Dagre from "dagre";
import { MarkerType } from "reactflow";

function layoutGraph(
	nodes: TReactFlowNode[],
	edges: TReactFlowEdge[],
	windowInnerWidth: number,
): TReactFlowNode[] {
	const g = new Dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
	g.setGraph({ rankdir: "TB" }); // vertical layout

	edges.forEach((edge) =>
		g.setEdge(edge.source! as string, edge.target! as string),
	);

	const width = 237;
	const height = 156; // rough estimate - actually depends on content
	nodes.forEach((node) =>
		g.setNode(node.id, {
			width,
			height,
		}),
	);

	Dagre.layout(g);

	// center the workflow graph on the x-axis
	const xValues = g.nodes().map((nodeId) => g.node(nodeId).x);
	const graphWidth = Math.max(...xValues) - Math.min(...xValues);
	const graphCenterX = Math.min(...xValues) + graphWidth / 2;
	const centerShift = windowInnerWidth / 2 - graphCenterX;

	const topOffset = 50;

	return nodes.map((node) => {
		// We are shifting the dagre node position (anchor=center center) to the top left
		// so it matches the React Flow node anchor point (top left).
		const position = g.node(node.id);
		return {
			...node,
			position: {
				x: position.x - width / 2 + centerShift,
				y: position.y - height / 2 + topOffset,
			},
		};
	});
}

export function prepareForReactFlow(
	workflow: TEditorWorkflowGraph,
	windowInnerWidth: number,
): TReactFlowGraph {
	const nodes: TReactFlowNode[] = workflow.nodes.map((node) => ({
		id: node.id,
		type: node.type,
		position: {
			x: 0,
			y: 0,
		},
		data: node,
		selected: false,
	}));

	const edges: TReactFlowEdge[] = workflow.edges.map((edge) => ({
		id: `${edge.source}_${edge.target}`,
		source: edge.source,
		sourceHandle: edge.type as string,
		target: edge.target,
		targetHandle: "target",
		type: edge.type,
		markerEnd: {
			type: MarkerType.ArrowClosed,
			height: 15,
			width: 15,
			color: "var(--Accent-color-Accent-9, #3E63DD)",
		},
	}));

	const positionedNodes = layoutGraph(nodes, edges, windowInnerWidth);

	return {
		...workflow,
		nodes: positionedNodes,
		edges,
	};
}

export function buildReactFlowActionNode(
	id: string,
	position: { x: number; y: number },
	actionType: string,
	actionMetadata: TActionMetadata,
): TReactFlowNode {
	const args: Record<string, any> = {};
	actionMetadata.arguments.forEach((argument) => {
		args[argument.argName] = argument.defaultValue || "";
	});
	return {
		id,
		type: EditorWorkflowNodeType.ACTION,
		position,
		data: {
			id,
			type: EditorWorkflowNodeType.ACTION,
			actionType,
			resultName: null,
			// TODO: How to initialize secrets mapping and args?
			secretsMapping: {},
			args,
		},
		selected: false,
	};
}

export function buildReactFlowIfNode(
	id: string,
	position: { x: number; y: number },
): TReactFlowNode {
	return {
		id,
		type: EditorWorkflowNodeType.IF_CONDITION,
		position,
		data: {
			id,
			type: EditorWorkflowNodeType.IF_CONDITION,
			actionType: "if_condition",
			condition: "",
		},
		selected: false,
	};
}
