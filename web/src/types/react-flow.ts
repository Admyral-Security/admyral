import z from "zod";
import { withCamelCaseTransform, withSnakeCaseTransform } from "./utils";
import { Edge, Node } from "reactflow";

export enum ScheduleType {
	CRON = "Cron",
	INTERVAL_SECONDS = "Interval Seconds",
	INTERVAL_MINUTES = "Interval Minutes",
	INTERVAL_HOURS = "Interval Hours",
	INTERVAL_DAYS = "Interval Days",
}

export const SCHEDULE_TYPES = [
	ScheduleType.CRON,
	ScheduleType.INTERVAL_SECONDS,
	ScheduleType.INTERVAL_MINUTES,
	ScheduleType.INTERVAL_HOURS,
	ScheduleType.INTERVAL_DAYS,
];

export enum EditorWorkflowNodeType {
	START = "start",
	ACTION = "action",
	IF_CONDITION = "if_condition",
	LOOP = "loop",
}

const EditorWebhookTrigger = withCamelCaseTransform(
	z.object({
		webhook_id: z.string().nullable(),
		webhook_secret: z.string().nullable(),
		default_args: z.array(z.tuple([z.string(), z.string()])),
	}),
);

const EditorScheduleTrigger = withCamelCaseTransform(
	z.object({
		schedule_type: z.nativeEnum(ScheduleType),
		value: z.string(),
		default_args: z.array(z.tuple([z.string(), z.string()])),
	}),
);
export type TEditorScheduleTrigger = z.infer<typeof EditorScheduleTrigger>;

export const EditorWorkflowStartNode = withCamelCaseTransform(
	z.object({
		id: z.literal("start"),
		type: z.literal(EditorWorkflowNodeType.START),
		action_type: z.literal("start"),
		webhook: EditorWebhookTrigger.nullable(),
		schedules: z.array(EditorScheduleTrigger),
		position: z.tuple([z.number(), z.number()]).nullable(),
	}),
);
export type TEditorWorkflowStartNode = z.infer<typeof EditorWorkflowStartNode>;

export const EditorWorkflowActionNode = withCamelCaseTransform(
	z.object({
		id: z.string(),
		type: z.literal(EditorWorkflowNodeType.ACTION),
		action_type: z.string(),
		result_name: z.string().nullable(),
		secrets_mapping: z.record(z.string(), z.string()),
		args: z.record(z.string(), z.string()),
		position: z.tuple([z.number(), z.number()]).nullable(),
	}),
);
export type TEditorWorkflowActionNode = z.infer<
	typeof EditorWorkflowActionNode
>;

export const EditorWorkflowIfNode = withCamelCaseTransform(
	z.object({
		id: z.string(),
		type: z.literal(EditorWorkflowNodeType.IF_CONDITION),
		action_type: z.literal("if_condition"),
		condition: z.string(),
		position: z.tuple([z.number(), z.number()]).nullable(),
	}),
);
export type TEditorWorkflowIfNode = z.infer<typeof EditorWorkflowIfNode>;

export enum LoopType {
	LIST = "list",
	COUNT = "count",
	CONDITION = "condition",
}

export const EditorWorkflowLoopNode = withCamelCaseTransform(
	z.object({
		id: z.string(),
		type: z.literal(EditorWorkflowNodeType.LOOP),
		action_type: z.literal("loop"),
		loop_name: z.string(),
		loop_condition: z.union([z.string(), z.number()]),
		loop_type: z.nativeEnum(LoopType),
		results_to_collect: z.string(),
		position: z.tuple([z.number(), z.number()]).nullable(),
	}),
);
export type TEditorWorkflowLoopNode = z.infer<typeof EditorWorkflowLoopNode>;

export enum EditorWorkflowHandleType {
	SOURCE = "source",
	TARGET = "target",
	TRUE = "true",
	FALSE = "false",
	LOOP_BODY_START = "loop_body_start",
	LOOP_BODY_END = "loop_body_end",
}

export const EditorWorkflowEdge = withCamelCaseTransform(
	z.object({
		source: z.string(),
		source_handle: z.nativeEnum(EditorWorkflowHandleType),
		target: z.string(),
		target_handle: z.nativeEnum(EditorWorkflowHandleType),
	}),
);
export type TEditorWorkflowEdge = z.infer<typeof EditorWorkflowEdge>;

export const EditorWorkflowGraph = withCamelCaseTransform(
	z.object({
		workflow_id: z.string(),
		workflow_name: z.string(),
		description: z.string().nullable(),
		controls: z.array(z.string()).nullable(),
		is_active: z.boolean(),
		nodes: z.array(
			z.union([
				EditorWorkflowStartNode,
				EditorWorkflowActionNode,
				EditorWorkflowIfNode,
				EditorWorkflowLoopNode,
			]),
		),
		edges: z.array(EditorWorkflowEdge),
	}),
);
export type TEditorWorkflowGraph = z.infer<typeof EditorWorkflowGraph>;

export type TReactFlowNode = Node<
	| TEditorWorkflowStartNode
	| TEditorWorkflowActionNode
	| TEditorWorkflowIfNode
	| TEditorWorkflowLoopNode
>;
export type TReactFlowEdge = Edge;
export type TReactFlowGraph = {
	workflowId: string;
	workflowName: string;
	description: string | null;
	controls: string[] | null;
	isActive: boolean;
	nodes: TReactFlowNode[];
	edges: TReactFlowEdge[];
};

////////////////////////////////////////////////////////////////////////////////

const EditorWebhookTriggerSnakeCase = withSnakeCaseTransform(
	z.object({
		webhookId: z.string().nullable(),
		webhookSecret: z.string().nullable(),
		defaultArgs: z.array(z.tuple([z.string(), z.string()])),
	}),
);

const EditorScheduleTriggerSnakeCase = withSnakeCaseTransform(
	z.object({
		scheduleType: z.nativeEnum(ScheduleType),
		value: z.string(),
		defaultArgs: z.array(z.tuple([z.string(), z.string()])),
	}),
);

export const EditorWorkflowStartNodeSnakeCase = withSnakeCaseTransform(
	z.object({
		id: z.literal("start"),
		type: z.literal(EditorWorkflowNodeType.START),
		actionType: z.literal("start"),
		webhook: EditorWebhookTriggerSnakeCase.nullable(),
		schedules: z.array(EditorScheduleTriggerSnakeCase),
		position: z.tuple([z.number(), z.number()]).nullable(),
	}),
);

export const EditorWorkflowActionNodeSnakeCase = withSnakeCaseTransform(
	z.object({
		id: z.string(),
		type: z.literal(EditorWorkflowNodeType.ACTION),
		actionType: z.string(),
		resultName: z.string().nullable(),
		secretsMapping: z.record(z.string(), z.string()),
		args: z.record(z.string(), z.string()),
		position: z.tuple([z.number(), z.number()]).nullable(),
	}),
);

export const EditorWorkflowIfNodeSnakeCase = withSnakeCaseTransform(
	z.object({
		id: z.string(),
		type: z.literal(EditorWorkflowNodeType.IF_CONDITION),
		actionType: z.literal("if_condition"),
		condition: z.string(),
		position: z.tuple([z.number(), z.number()]).nullable(),
	}),
);

export const EditorWorkflowLoopNodeSnakeCase = withSnakeCaseTransform(
	z.object({
		id: z.string(),
		type: z.literal(EditorWorkflowNodeType.LOOP),
		actionType: z.literal("loop"),
		loopName: z.string(),
		loopType: z.nativeEnum(LoopType),
		loopCondition: z.union([z.string(), z.number()]),
		resultsToCollect: z.string(),
		position: z.tuple([z.number(), z.number()]).nullable(),
	}),
);

export const EditorWorkflowEdgeSnakeCase = withSnakeCaseTransform(
	z.object({
		source: z.string(),
		sourceHandle: z.nativeEnum(EditorWorkflowHandleType),
		target: z.string(),
		targetHandle: z.nativeEnum(EditorWorkflowHandleType),
	}),
);

export const EditorWorkflowGraphSnakeCase = withSnakeCaseTransform(
	z.object({
		workflowId: z.string(),
		workflowName: z.string(),
		description: z.string().nullable(),
		controls: z.array(z.string()).nullable(),
		isActive: z.boolean(),
		nodes: z.array(
			z.union([
				EditorWorkflowStartNodeSnakeCase,
				EditorWorkflowActionNodeSnakeCase,
				EditorWorkflowIfNodeSnakeCase,
				EditorWorkflowLoopNodeSnakeCase,
			]),
		),
		edges: z.array(EditorWorkflowEdgeSnakeCase),
	}),
);
