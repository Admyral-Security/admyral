"use client";

import { Card, Flex, Text } from "@radix-ui/themes";
import AssistantIcon from "./icons/assistant-icon";

export interface WorkflowAssistantButtonProps {
	clicked: boolean;
	onClick: () => void;
}

export default function WorkflowAssistantButton({
	clicked,
	onClick,
}: WorkflowAssistantButtonProps) {
	if (!clicked) {
		return (
			<Card
				style={{
					padding: "0px",
					cursor: "pointer",
					width: "95%",
					backgroundColor: "#F5F2FF",
					borderColor: "#F5F2FF",
				}}
				onClick={onClick}
			>
				<Flex
					gap="2"
					style={{ backgroundColor: "#F5F2FF" }}
					p="8px"
					justify="center"
					align="center"
				>
					<AssistantIcon fill="#1C2024" />
					<Text size="3" weight="medium" style={{ color: "#1C2024" }}>
						Workflow Assistant
					</Text>
				</Flex>
			</Card>
		);
	}

	return (
		<Card
			style={{
				padding: "0px",
				cursor: "pointer",
				width: "95%",
				backgroundColor: "#6E56CF",
				borderColor: "#6E56CF",
			}}
			onClick={onClick}
		>
			<Flex
				gap="2"
				style={{ backgroundColor: "#6E56CF" }}
				p="8px"
				justify="center"
				align="center"
			>
				<AssistantIcon fill="white" />
				<Text size="3" weight="medium" style={{ color: "white" }}>
					Workflow Assistant
				</Text>
			</Flex>
		</Card>
	);
}
