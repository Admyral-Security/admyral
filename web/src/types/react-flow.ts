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
	}),
);
export type TEditorWorkflowIfNode = z.infer<typeof EditorWorkflowIfNode>;

export enum EditorWorkflowEdgeType {
	DEFAULT = "default",
	TRUE = "true",
	FALSE = "false",
}

export const EditorWorkflowEdge = withCamelCaseTransform(
	z.object({
		source: z.string(),
		target: z.string(),
		type: z.nativeEnum(EditorWorkflowEdgeType),
	}),
);
export type TEditorWorkflowEdge = z.infer<typeof EditorWorkflowEdge>;

export const EditorWorkflowGraph = withCamelCaseTransform(
	z.object({
		workflow_id: z.string(),
		workflow_name: z.string(),
		description: z.string().nullable(),
		is_active: z.boolean(),
		nodes: z.array(
			z.union([
				EditorWorkflowStartNode,
				EditorWorkflowActionNode,
				EditorWorkflowIfNode,
			]),
		),
		edges: z.array(EditorWorkflowEdge),
	}),
);
export type TEditorWorkflowGraph = z.infer<typeof EditorWorkflowGraph>;

export type TReactFlowNode = Node<
	TEditorWorkflowStartNode | TEditorWorkflowActionNode | TEditorWorkflowIfNode
>;
export type TReactFlowEdge = Edge;
export type TReactFlowGraph = {
	workflowId: string;
	workflowName: string;
	description: string | null;
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
	}),
);

export const EditorWorkflowIfNodeSnakeCase = withSnakeCaseTransform(
	z.object({
		id: z.string(),
		type: z.literal(EditorWorkflowNodeType.IF_CONDITION),
		actionType: z.literal("if_condition"),
		condition: z.string(),
	}),
);

export const EditorWorkflowEdgeSnakeCase = withSnakeCaseTransform(
	z.object({
		source: z.string(),
		target: z.string(),
		type: z.nativeEnum(EditorWorkflowEdgeType),
	}),
);

export const EditorWorkflowGraphSnakeCase = withSnakeCaseTransform(
	z.object({
		workflowId: z.string(),
		workflowName: z.string(),
		description: z.string().nullable(),
		isActive: z.boolean(),
		nodes: z.array(
			z.union([
				EditorWorkflowStartNodeSnakeCase,
				EditorWorkflowActionNodeSnakeCase,
				EditorWorkflowIfNodeSnakeCase,
			]),
		),
		edges: z.array(EditorWorkflowEdge),
	}),
);
