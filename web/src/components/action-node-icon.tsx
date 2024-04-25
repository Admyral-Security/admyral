import { ActionNode } from "@/lib/types";
import WebhookActionIcon from "./icons/webhook-action-icon";
import HttpRequestActionIcon from "./icons/http-request-action-icon";
import TransformActionIcon from "./icons/transform-action-icon";
import IfConditionActionIcon from "./icons/if-condition-action-icon";
import AiActionsIcon from "./icons/ai-actions-icon";
import SendEmailActionIcon from "./icons/send-email-action-icon";
import ReceiveEmailActionIcon from "./icons/receive-email-action-icon";

export interface ActionNodeIconProps {
	actionType: ActionNode;
}

export default function ActionNodeIcon({ actionType }: ActionNodeIconProps) {
	switch (actionType) {
		case ActionNode.WEBHOOK:
			return <WebhookActionIcon />;
		case ActionNode.HTTP_REQUEST:
			return <HttpRequestActionIcon />;
		case ActionNode.TRANSFORM:
			return <TransformActionIcon />;
		case ActionNode.IF_CONDITION:
			return <IfConditionActionIcon />;
		case ActionNode.AI_ACTION:
			return <AiActionsIcon />;
		case ActionNode.SEND_EMAIL:
			return <SendEmailActionIcon />;
		case ActionNode.RECEIVE_EMAIL:
			return <ReceiveEmailActionIcon />;
		default:
			return null;
	}
}
