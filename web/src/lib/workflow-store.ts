import { create } from "zustand";
import {
	Connection,
	EdgeChange,
	Node,
	NodeChange,
	addEdge,
	OnNodesChange,
	OnEdgesChange,
	OnConnect,
	applyNodeChanges,
	applyEdgeChanges,
	MarkerType,
	NodeRemoveChange,
	EdgeRemoveChange,
} from "reactflow";
import { ActionData, EdgeType } from "./types";
import { DirectedEdge } from "@/components/workflow-graph/edge";
import { cloneDeep } from "lodash";
import {
	IF_CONDITION_FALSE_BRANCH_HANDLE_ID,
	IF_CONDITION_TRUE_BRANCH_HANDLE_ID,
} from "@/components/workflow-graph/if-condition-node";
import { NEW_MARKER } from "./workflow-node";
import { initActionData } from "./workflows";

type WorkflowState = {
	nextId: number;
	nodes: Node<ActionData>[];
	deletedNodes: string[];
	edges: DirectedEdge[];
	deletedEdges: [string, string][];
	triggerNodeId: string | null;
	onNodesChange: OnNodesChange;
	onEdgesChange: OnEdgesChange;
	onConnect: OnConnect;
	setNodes: (nodes: Node<ActionData>[]) => void;
	setEdges: (edges: DirectedEdge[]) => void;
	updateNodeData: (nodeId: string, data: ActionData) => void;
	deleteNode: (nodeId: string) => void;
	duplicateNode: (nodeId: string) => Promise<void>;
	setTriggerNodeId: (nodeId: string | null) => void;
	setDeletedNodes: (deletedNodes: string[]) => void;
	setDeletedEdges: (deletedEdges: [string, string][]) => void;
	getId: () => string;
	clear: () => void;
	hasUnsavedChanges: () => boolean;
};

const useWorkflowStore = create<WorkflowState>((set, get) => ({
	nextId: 0,
	nodes: [],
	deletedNodes: [],
	edges: [],
	deletedEdges: [],
	triggerNodeId: null,
	onNodesChange: (changes: NodeChange[]) => {
		// Track deleted nodes which were already persisted
		const deletedNodeIds = changes
			.filter(
				(change) =>
					change.type === "remove" &&
					!change.id.startsWith(NEW_MARKER),
			)
			.map((change) => (change as NodeRemoveChange).id);
		let deletedNodes = cloneDeep(get().deletedNodes);
		if (deletedNodeIds.length > 0) {
			deletedNodes = [...deletedNodes, ...deletedNodeIds];
		}

		set({
			nodes: applyNodeChanges(changes, get().nodes),
			deletedNodes,
		});
	},
	onEdgesChange: (changes: EdgeChange[]) => {
		// Track deleted edges which were already persisted
		const deletedEdgeIds = changes
			.filter(
				(change) =>
					change.type === "remove" &&
					!change.id.startsWith(NEW_MARKER),
			)
			.map((change) => (change as EdgeRemoveChange).id);
		let deletedEdges = cloneDeep(get().deletedEdges);
		if (deletedEdgeIds.length > 0) {
			const deletedEdgeIdsLookup = new Set(deletedEdgeIds);
			const deletedEdgesUpdate = get()
				.edges.filter((edge) => deletedEdgeIdsLookup.has(edge.id))
				.map((edge) => [edge.source, edge.target] as [string, string]);
			deletedEdges = [...deletedEdges, ...deletedEdgesUpdate];
		}

		set({
			edges: applyEdgeChanges(changes, get().edges),
			deletedEdges,
		});
	},
	onConnect: (connection: Connection) => {
		let edgeType = EdgeType.DEFAULT;
		if (connection.sourceHandle === IF_CONDITION_TRUE_BRANCH_HANDLE_ID) {
			edgeType = EdgeType.TRUE;
		}
		if (connection.sourceHandle === IF_CONDITION_FALSE_BRANCH_HANDLE_ID) {
			edgeType = EdgeType.FALSE;
		}

		const edge = {
			...connection,
			id: get().getId(),
			type: edgeType,
			markerEnd: {
				type: MarkerType.ArrowClosed,
				height: 15,
				width: 15,
				color: "var(--Accent-color-Accent-9, #3E63DD)",
			},
		};

		set({
			edges: addEdge(edge, get().edges),
		});
	},
	setNodes: (nodes: Node<ActionData>[]) => {
		set({ nodes });
	},
	setEdges: (edges: DirectedEdge[]) => {
		set({ edges });
	},
	updateNodeData: (nodeId: string, data: ActionData) => {
		const idx = get().nodes.findIndex((node) => node.id === nodeId);
		if (idx === -1) {
			return;
		}
		const nodes = cloneDeep(get().nodes);
		nodes[idx].data = data;
		set({ nodes });
	},
	deleteNode: (nodeId: string) => {
		const idx = get().nodes.findIndex((node) => node.id === nodeId);
		if (idx === -1) {
			return;
		}

		// clean up nodes
		const nodes = cloneDeep(get().nodes);
		nodes.splice(idx, 1);

		// if the node was already persisted, keep track of it
		let deletedNodes = cloneDeep(get().deletedNodes);
		if (!nodeId.startsWith(NEW_MARKER)) {
			deletedNodes.push(nodeId);
		}

		// clean up edges
		const edges = cloneDeep(get().edges);
		const filteredEdges = edges.filter(
			(edge) => edge.source !== nodeId && edge.target !== nodeId,
		);

		// keep track of already persisted edges
		let deletedEdges = cloneDeep(get().deletedEdges);
		const deletedEdgesUpdate = edges
			.filter((edge) => edge.source === nodeId || edge.target === nodeId)
			.map((edge) => [edge.source, edge.target] as [string, string]);
		if (!nodeId.startsWith(NEW_MARKER) && deletedEdgesUpdate.length > 0) {
			deletedEdges = [...deletedEdges, ...deletedEdgesUpdate];
		}

		set({ nodes, edges: filteredEdges, deletedNodes, deletedEdges });
	},
	duplicateNode: async (nodeId: string) => {
		const idx = get().nodes.findIndex((node) => node.id === nodeId);
		if (idx === -1) {
			return;
		}

		const node = get().nodes[idx];

		const newNodeId = get().getId();
		const newName = `${node.data.actionName} (copy)`;

		const newPosition = {
			x: node.position.x + 100,
			y: node.position.y + 100,
		};

		const data = await initActionData(
			node.data.actionType,
			newNodeId,
			newName,
			newPosition.x,
			newPosition.y,
		);
		data.actionDescription = node.data.actionDescription;
		data.actionDefinition = node.data.actionDefinition;

		const duplicatedNode = {
			id: newNodeId,
			type: node.type,
			position: newPosition,
			data,
		};

		const clonedNodes = cloneDeep(get().nodes);
		clonedNodes.push(duplicatedNode);
		set({ nodes: clonedNodes });
	},
	setTriggerNodeId: (nodeId: string | null) => {
		set({ triggerNodeId: nodeId });
	},
	setDeletedNodes: (deletedNodes: string[]) => {
		set({ deletedNodes });
	},
	setDeletedEdges: (deletedEdges: [string, string][]) => {
		set({ deletedEdges });
	},
	getId: () => {
		const nextId = get().nextId;
		set({ nextId: nextId + 1 });
		return `${NEW_MARKER}workflow_object_${nextId}`;
	},
	clear: () => {
		set({
			nextId: 0,
			nodes: [],
			deletedNodes: [],
			edges: [],
			deletedEdges: [],
		});
	},
	hasUnsavedChanges: () => {
		return (
			get().deletedNodes.length > 0 ||
			get().deletedEdges.length > 0 ||
			get().nodes.some((node) => node.id.startsWith(NEW_MARKER)) ||
			get().edges.some((edge) => edge.id.startsWith(NEW_MARKER))
		);
	},
}));

export default useWorkflowStore;
