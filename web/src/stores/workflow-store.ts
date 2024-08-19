import { create } from "zustand";
import {
	EditorWorkflowEdgeType,
	EditorWorkflowNodeType,
	TEditorWorkflowActionNode,
	TEditorWorkflowIfNode,
	TEditorWorkflowGraph,
	TEditorWorkflowStartNode,
	TReactFlowGraph,
	TReactFlowNode,
	TReactFlowEdge,
} from "@/types/react-flow";
import { produce } from "immer";
import {
	addEdge,
	applyEdgeChanges,
	applyNodeChanges,
	Connection,
	EdgeChange,
	MarkerType,
	Node,
	NodeChange,
	OnConnect,
	OnEdgesChange,
	OnNodesChange,
} from "reactflow";
import _ from "lodash";

function buildStartNode(
	windowInnerWidth: number,
): Node<TEditorWorkflowStartNode> {
	const width = 237;
	return {
		id: "start",
		type: EditorWorkflowNodeType.START,
		position: {
			x: windowInnerWidth / 2 - width / 2,
			y: 50,
		},
		data: {
			id: "start",
			type: EditorWorkflowNodeType.START,
			actionType: "start",
			webhook: null,
			schedules: [],
		},
		selected: false,
	};
}

type WorkflowStoreState = TReactFlowGraph & {
	// Other
	isNew: boolean;
	nextId: number;
	webhookId: string | null;
	webhookSecret: string | null;
	lastDeletedEdges: TReactFlowEdge[];
	// Operations
	clearWorkflowStore: () => void;
	initWorkflow: (workflowId: string, windowInnerWidth: number) => void;
	setWorkflow: (workflow: TReactFlowGraph) => void;
	setIsActive: (newIsActive: boolean) => void;
	setIsNew: (isNew: boolean) => void;
	getWorkflow: () => TEditorWorkflowGraph;
	onConnect: OnConnect;
	getEdgeId: () => string;
	onNodesChange: OnNodesChange;
	onEdgesChange: OnEdgesChange;
	addNode: (node: TReactFlowNode) => void;
	getNodeId: () => string;
	setWorkflowName: (workflowName: string) => void;
	setDescription: (description: string) => void;
	updateNodeData: (
		nodeIdx: number,
		data:
			| TEditorWorkflowStartNode
			| TEditorWorkflowActionNode
			| TEditorWorkflowIfNode,
	) => void;
	updateWebhookIdAndSecret: (
		webhookId: string,
		webhookSecret: string,
	) => void;
	deleteNodeByIdx: (nodeIdx: number) => void;
	duplicateNodeByIdx: (nodeIdx: number) => void;
	// Settings Side Panel
	detailPageType: "workflow" | "action" | null;
	selectedNodeIdx: number | null;
	clickWorkflowSettings: () => void;
	setSelectedNode: (selectedNodeIdx: number) => void;
	closeSettingsSidePanel: () => void;
};

export const useWorkflowStore = create<WorkflowStoreState>((set, get) => ({
	// ReactFlow graph
	workflowId: "",
	workflowName: "",
	description: null,
	isActive: false,
	nodes: [],
	edges: [],
	// Other
	isNew: false,
	nextId: 0,
	webhookId: null,
	webhookSecret: null,
	lastDeletedEdges: [],
	// Operations
	clearWorkflowStore: () => {
		set({
			workflowId: "",
			workflowName: "",
			description: null,
			isActive: false,
			nodes: [],
			edges: [],
			isNew: false,
			nextId: 0,
			webhookId: null,
			webhookSecret: null,
			detailPageType: "workflow",
			selectedNodeIdx: null,
		});
	},
	initWorkflow: (workflowId: string, windowInnerWidth: number) => {
		set({
			workflowId,
			workflowName: "",
			description: null,
			isActive: false,
			nodes: [buildStartNode(windowInnerWidth)],
			edges: [],
			isNew: true,
			webhookId: null,
			webhookSecret: null,
			detailPageType: "workflow",
			selectedNodeIdx: null,
		});
	},
	setWorkflow: (workflow: TReactFlowGraph) =>
		set(
			produce((draft) => {
				draft.workflowId = workflow.workflowId;
				draft.workflowName = workflow.workflowName;
				draft.description = workflow.description;
				draft.isActive = workflow.isActive;
				draft.nodes = workflow.nodes;
				draft.edges = workflow.edges;

				const startNodeIdx = workflow.nodes.findIndex(
					(node: TReactFlowNode) =>
						node.type === EditorWorkflowNodeType.START,
				);
				if (startNodeIdx !== -1) {
					const startNodeData = workflow.nodes[startNodeIdx]
						.data as TEditorWorkflowStartNode;

					if (startNodeData.webhook) {
						draft.webhookId = startNodeData.webhook.webhookId;
						draft.webhookSecret =
							startNodeData.webhook.webhookSecret;
					}
				}
			}),
		),
	setIsActive: (newIsActive: boolean) => set({ isActive: newIsActive }),
	setIsNew: (isNew: boolean) => set({ isNew }),
	getWorkflow: () => {
		return {
			workflowId: get().workflowId,
			workflowName: get().workflowName,
			description: get().description,
			isActive: get().isActive,
			nodes: get().nodes.map((node) => node.data),
			edges: get().edges.map((edge) => ({
				source: edge.source,
				target: edge.target,
				type: edge.type!,
			})),
		} as TEditorWorkflowGraph;
	},
	onConnect: (connection: Connection) => {
		let edgeType = EditorWorkflowEdgeType.DEFAULT;
		if (connection.sourceHandle === "true") {
			edgeType = EditorWorkflowEdgeType.TRUE;
		}
		if (connection.sourceHandle === "false") {
			edgeType = EditorWorkflowEdgeType.FALSE;
		}

		const edge = {
			...connection,
			id: get().getEdgeId(),
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
	getEdgeId: () => {
		const edgeId = `edge_${get().nextId}`;
		set({
			nextId: get().nextId + 1,
		});
		return edgeId;
	},
	onNodesChange: (changes: NodeChange[]) => {
		// Don't allow deleting start nodes
		const isStartRemovalTry =
			changes.filter(
				(change) => change.type === "remove" && change.id === "start",
			).length > 0;
		if (isStartRemovalTry) {
			// we ignore the deletion but we need to add the previously deleted
			// edges back
			set(
				produce((draft) => {
					draft.edges.push(...get().lastDeletedEdges);
					draft.lastDeletedEdges = [];
				}),
			);
			return;
		}

		const isDeletion =
			changes.filter((change) => change.type === "remove").length > 0;
		set({
			nodes: applyNodeChanges(changes, get().nodes),
			detailPageType:
				isDeletion && get().detailPageType === "action"
					? null
					: get().detailPageType,
			selectedNodeIdx: isDeletion ? null : get().selectedNodeIdx,
		});
	},
	onEdgesChange: (changes: EdgeChange[]) => {
		const deletedEdges = new Set(
			changes
				.filter((change) => change.type === "remove")
				.map((change) => change.id),
		);

		set({
			edges: applyEdgeChanges(changes, get().edges),
			// Remember the last deleted edges
			lastDeletedEdges: produce(get().edges, (draft) =>
				draft.filter((edge) => deletedEdges.has(edge.id)),
			),
		});
	},
	addNode: (node: TReactFlowNode) =>
		set(
			produce((draft) => {
				draft.nodes.push(node);
			}),
		),
	getNodeId: () => {
		let newIdx = get().nextId;
		let nodeId = `node_${newIdx}`;
		while (get().nodes.findIndex((node) => node.id === nodeId) !== -1) {
			newIdx += 1;
			nodeId = `node_${newIdx}`;
		}
		set({
			nextId: newIdx + 1,
		});
		return nodeId;
	},
	setWorkflowName: (workflowName) =>
		set(
			produce((draft) => {
				draft.workflowName = workflowName;
			}),
		),
	setDescription: (description) =>
		set(
			produce((draft) => {
				draft.description = description;
			}),
		),
	updateNodeData: (
		nodeIdx: number,
		data:
			| TEditorWorkflowStartNode
			| TEditorWorkflowActionNode
			| TEditorWorkflowIfNode,
	) =>
		set(
			produce((draft) => {
				draft.nodes[nodeIdx].data = data;
			}),
		),
	updateWebhookIdAndSecret: (webhookId: string, webhookSecret: string) =>
		set(
			produce((draft) => {
				const startNodeIdx = draft.nodes.findIndex(
					(node: TReactFlowNode) =>
						node.type === EditorWorkflowNodeType.START,
				);
				if (startNodeIdx === -1) {
					// TODO: this cannot happen because we always have a start node
					return;
				}
				if (!draft.nodes[startNodeIdx].data.webhook) {
					draft.nodes[startNodeIdx].data.webhook = {
						webhookId,
						webhookSecret,
						defaultArgs: {},
					};
				} else {
					draft.nodes[startNodeIdx].data.webhook.webhookId =
						webhookId;
					draft.nodes[startNodeIdx].data.webhook.webhookSecret =
						webhookSecret;
				}
			}),
		),
	duplicateNodeByIdx: (nodeIdx: number) => {
		const newNodeId = get().getNodeId();
		set(
			produce((draft) => {
				const duplicate = _.cloneDeep(
					draft.nodes[nodeIdx] as TReactFlowNode,
				);
				duplicate.id = newNodeId;
				duplicate.data.id = duplicate.id;
				duplicate.position.x += 100;
				duplicate.position.y += 100;
				duplicate.selected = false;
				draft.nodes.push(duplicate);
			}),
		);
	},
	deleteNodeByIdx: (nodeIdx: number) =>
		set(
			produce((draft) => {
				const node = draft.nodes[nodeIdx];
				draft.nodes.splice(nodeIdx, 1);
				draft.edges = draft.edges.filter(
					(edge: TReactFlowEdge) =>
						edge.source !== node.id && edge.target !== node.id,
				);

				if (
					draft.detailPageType === "action" &&
					draft.selectedNodeIdx === nodeIdx
				) {
					draft.detailPageType = null;
					draft.selectedNodeIdx = null;
				}
			}),
		),
	// Settings Side Panel
	detailPageType: "workflow",
	selectedNodeIdx: null,
	clickWorkflowSettings: () =>
		set(
			produce((draft) => {
				if (draft.detailPageType !== "workflow") {
					draft.detailPageType = "workflow";
					draft.selectedNodeIdx = null;

					// If we open the workflow settings edit page, we unselect the
					// node. We need to manually unselect the node because reactflow
					// does not update the nodes in this case.
					draft.nodes = draft.nodes.map((node: any) => {
						node.selected = false;
						return node;
					});
				} else {
					draft.detailPageType = null;
					draft.selectedNodeIdx = null;
				}
			}),
		),
	setSelectedNode: (selectedNodeIdx: number) =>
		set(
			produce((draft) => {
				if (selectedNodeIdx !== -1) {
					draft.detailPageType = "action";
					draft.selectedNodeIdx = selectedNodeIdx;
				} else {
					draft.detailPageType = null;
					draft.selectedNodeIdx = null;
				}
			}),
		),
	closeSettingsSidePanel: () =>
		set(
			produce((draft) => {
				draft.detailPageType = null;
				draft.selectedNodeIdx = null;
			}),
		),
}));
