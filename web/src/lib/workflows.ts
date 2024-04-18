export function generateReferenceHandle(actionName: string): string {
	// TODO: make sure that reference handle is unique within a workflow
	return actionName.toLowerCase().replaceAll(" ", "_");
}

export enum ActionNode {
	WEBHOOK = "Webhook",
	HTTP_REQUEST = "HTTPRequest",
	TRANSFORM = "Transform",
	IF_CONDITION = "IfCondition",
	AI_ACTION = "AiAction",
	SEND_EMAIL = "SendEmail",
	RECEIVE_EMAIL = "ReceiveEmail",
}

export function getActionNodeLabel(actionNode: ActionNode) {
	switch (actionNode) {
		case ActionNode.WEBHOOK:
			return "Webhook";
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
	}
}

export enum IfConditionOperator {
	EQUAL = "eq",
	NOT_EQUAL = "ne",
	GREATER_THAN = "gt",
	GREATER_THAN_OR_EQUAL = "gte",
	LESS_THAN = "lt",
	LESS_THAN_OR_EQUAL = "lte",
	MATCH_REGEX = "regex",
	NOT_MATCH_REGEX = "not_regex",
}

export function getIfConditionOperatorLabel(
	ifConditionOperator: IfConditionOperator,
) {
	switch (ifConditionOperator) {
		case IfConditionOperator.EQUAL:
			return "equals";
		case IfConditionOperator.NOT_EQUAL:
			return "does not equal";
		case IfConditionOperator.GREATER_THAN:
			return "is greater than";
		case IfConditionOperator.GREATER_THAN_OR_EQUAL:
			return "is greater than or equal to";
		case IfConditionOperator.LESS_THAN:
			return "is less than";
		case IfConditionOperator.LESS_THAN_OR_EQUAL:
			return "is less than or equal to";
		case IfConditionOperator.MATCH_REGEX:
			return "matches regex";
		case IfConditionOperator.NOT_MATCH_REGEX:
			return "does not match regex";
	}
}
