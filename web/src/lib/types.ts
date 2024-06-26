import { IntegrationType } from "./integrations";

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
	INTEGRATION = "INTEGRATION",
}

export function getActionNodeLabel(actionNode: ActionNode) {
	switch (actionNode) {
		case ActionNode.WEBHOOK:
		case ActionNode.MANUAL_START:
			return "Start Workflow";
		case ActionNode.HTTP_REQUEST:
			return "HTTP Request";
		case ActionNode.INTEGRATION:
			return "Integration";
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
	IS_EMPTY = "IS_EMPTY",
	IS_NOT_EMPTY = "IS_NOT_EMPTY",
	EXISTS = "EXISTS",
	DOES_NOT_EXIST = "DOES_NOT_EXIST",
}

export const IF_CONDITION_OPERATORS = [
	IfConditionOperator.EQUALS,
	IfConditionOperator.NOT_EQUALS,
	IfConditionOperator.GREATER_THAN,
	IfConditionOperator.GREATER_THAN_OR_EQUAL,
	IfConditionOperator.LESS_THAN,
	IfConditionOperator.LESS_THAN_OR_EQUAL,
	IfConditionOperator.IS_EMPTY,
	IfConditionOperator.IS_NOT_EMPTY,
	IfConditionOperator.EXISTS,
	IfConditionOperator.DOES_NOT_EXIST,
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
		case IfConditionOperator.IS_EMPTY:
			return "is empty";
		case IfConditionOperator.IS_NOT_EMPTY:
			return "is not empty";
		case IfConditionOperator.EXISTS:
			return "exists";
		case IfConditionOperator.DOES_NOT_EXIST:
			return "does not exist";
	}
}

export enum EdgeType {
	TRUE = "TRUE",
	FALSE = "FALSE",
	DEFAULT = "DEFAULT",
}

export type InputTemplate = {
	templateName: string;
	template: string;
};

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
	inputTemplates: InputTemplate[] | null;
};

export type AiActionData = ActionDataBase<{
	provider: string;
	model?: string;
	credential?: string;
	prompt: string;
	topP?: number;
	temperature?: number;
	maxTokens?: number;
}>;

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

export type IntegrationData = ActionDataBase<{
	integrationType: IntegrationType | null;
	api: string | null;
	params: Record<string, any>;
	credential: string | undefined;
}>;

export type ActionData =
	| AiActionData
	| HttpRequestData
	| WebhookData
	| ManualStartData
	| IfConditionData
	| SendEmailData
	| ReceiveEmailData
	| NoteData
	| IntegrationData;

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
	icon: IntegrationType | null;
};

export type WorkflowRun = {
	runId: string;
	startedAt: string;
	completeddAt: string | null;
	actionStateCount: number;
	error: string | null;
};

export type WorkflowRunEvent = {
	actionStateId: string;
	createdAt: string;
	actionType: ActionNode;
	actionName: string;
	actionDefinition: Record<string, any>;
	actionState: any;
	prevActionStateId: string | null;
	isError: boolean;
};

export type Quota = {
	workflowRunsLastHour: number;
	workflowRunHourlyQuota: number | undefined;
	workflowRunTimeoutInMinutes: number | undefined;
	workflowGenerationsLast24h: number;
	workflowAssistantQuota: number | undefined;
};

export type UserProfile = {
	firstName: string;
	lastName: string;
	company: string;
	email: string;
};

export type GenerateWorkflowAction = {
	actionId: string;
	actionType: ActionNode;
	actionName: string;
};

export type GenerateWorkflowConnection = {
	source: string;
	target: string;
	connectionType: EdgeType;
};

export type GenerateWorkflowResult = {
	actions: GenerateWorkflowAction[];
	connections: GenerateWorkflowConnection[];
};

export type Credential = {
	name: string;
	credentialType: IntegrationType | null;
};
