export enum LLM {
	GPT4_TURBO = "gpt-4-turbo",
	GPT3_5_TURBO = "gpt-3.5-turbo",
}

export function getLLMLabel(model: LLM) {
	switch (model) {
		case LLM.GPT4_TURBO:
			return "GPT-4 Turbo";
		case LLM.GPT3_5_TURBO:
			return "GPT-3.5 Turbo";
	}
}

export const LLM_MODELS = [LLM.GPT4_TURBO, LLM.GPT3_5_TURBO];

export enum ActionNode {
	MANUAL_START = "MANUAL_START",
	WEBHOOK = "WEBHOOK",
	HTTP_REQUEST = "HTTP_REQUEST",
	TRANSFORM = "TRANSFORM",
	IF_CONDITION = "IF_CONDITION",
	AI_ACTION = "AI_ACTION",
	SEND_EMAIL = "SEND_EMAIL",
	RECEIVE_EMAIL = "RECEIVE_EMAIL",
	NOTE = "NOTE",
}

export function getActionNodeLabel(actionNode: ActionNode) {
	switch (actionNode) {
		case ActionNode.WEBHOOK:
		case ActionNode.MANUAL_START:
			return "Start Workflow";
		case ActionNode.HTTP_REQUEST:
			return "HTTP Request";
		case ActionNode.TRANSFORM:
			return "Transform";
		case ActionNode.IF_CONDITION:
			return "If-Condition";
		case ActionNode.AI_ACTION:
			return "AI Action";
		case ActionNode.SEND_EMAIL:
			return "Send Email";
		case ActionNode.RECEIVE_EMAIL:
			return "Receive Email";
		case ActionNode.NOTE:
			return "Note";
	}
}

export enum IfConditionOperator {
	EQUALS = "EQUALS",
	NOT_EQUALS = "NOT_EQUALS",
	GREATER_THAN = "GREATER_THAN",
	GREATER_THAN_OR_EQUAL = "GREATER_THAN_OR_EQUAL",
	LESS_THAN = "LESS_THAN",
	LESS_THAN_OR_EQUAL = "LESS_THAN_OR_EQUAL",
}

export const IF_CONDITION_OPERATORS = [
	IfConditionOperator.EQUALS,
	IfConditionOperator.NOT_EQUALS,
	IfConditionOperator.GREATER_THAN,
	IfConditionOperator.GREATER_THAN_OR_EQUAL,
	IfConditionOperator.LESS_THAN,
	IfConditionOperator.LESS_THAN_OR_EQUAL,
];

export function getIfConditionOperatorLabel(
	ifConditionOperator: IfConditionOperator,
) {
	switch (ifConditionOperator) {
		case IfConditionOperator.EQUALS:
			return "equals";
		case IfConditionOperator.NOT_EQUALS:
			return "does not equal";
		case IfConditionOperator.GREATER_THAN:
			return "is greater than";
		case IfConditionOperator.GREATER_THAN_OR_EQUAL:
			return "is greater than or equal to";
		case IfConditionOperator.LESS_THAN:
			return "is less than";
		case IfConditionOperator.LESS_THAN_OR_EQUAL:
			return "is less than or equal to";
	}
}

export enum EdgeType {
	TRUE = "TRUE",
	FALSE = "FALSE",
	DEFAULT = "DEFAULT",
}

export type ActionDataBase<T> = {
	actionId: string;
	actionName: string;
	referenceHandle: string;
	actionDescription: string;
	xPosition: number;
	yPosition: number;
	actionType: ActionNode;
	actionDefinition: T;
	webhookId: string | null;
	secret: string | null;
};

export type AiActionData = ActionDataBase<{ model: LLM; prompt: string }>;

export type HttpRequestData = ActionDataBase<{
	method: string;
	url: string;
	contentType: string;
	headers: {
		key: string;
		value: string;
	}[];
	payload: string;
}>;

export type WebhookData = ActionDataBase<{}> & {
	webhookId: string;
	secret: string;
};

export type ManualStartData = WebhookData;

export type IfConditionData = ActionDataBase<{
	conditions: {
		lhs: string;
		operator: IfConditionOperator;
		rhs: string;
	}[];
}>;

export type SendEmailData = ActionDataBase<{
	recipients: string[];
	subject: string;
	body: string;
	senderName: string;
}>;

// TODO:
export type ReceiveEmailData = ActionDataBase<{}>;

export type NoteData = ActionDataBase<{ note: string }>;

export type ActionData =
	| AiActionData
	| HttpRequestData
	| WebhookData
	| ManualStartData
	| IfConditionData
	| SendEmailData
	| ReceiveEmailData
	| NoteData;

export type EdgeData = {
	parentActionId: string;
	parentNodeHandle: string | null | undefined;
	childActionId: string;
	childNodeHandle: string | null | undefined;
	edgeType: EdgeType;
};

export type WorkflowData = {
	workflowName: string;
	workflowDescription: string;
	isLive: boolean;
	actions: ActionData[];
	edges: EdgeData[];
};

export type WorkflowTemplate = {
	workflowId: string;
	templateHeadline: string;
	templateDescription: string;
	category: string;
	icon: string;
};

export type WorkflowRun = {
	runId: string;
	startedAt: string;
	completeddAt: string | null;
	actionStateCount: number;
};

export type WorkflowRunEvent = {
	actionStateId: string;
	createdAt: string;
	actionType: ActionNode;
	actionName: string;
	actionState: Record<string, any>;
	prevActionStateId: string | null;
	isError: boolean;
};

export type Quota = {
	workflowRunsLastHour: number;
	workflowRunHourlyQuota: number | undefined;
	workflowRunTimeoutInMinutes: number | undefined;
};

export type UserProfile = {
	firstName: string;
	lastName: string;
	company: string;
	email: string;
};
