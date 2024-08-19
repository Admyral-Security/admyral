import { Card, Flex, Text } from "@radix-ui/themes";
import ActionIcon from "./action-icon";

export default function EditorActionCard({
	label,
	actionType,
	hideIcon,
}: {
	actionType: string;
	label: string;
	hideIcon?: boolean;
}) {
	const onDragStart = (event: any, actionType: string) => {
		event.dataTransfer.setData("application/reactflow", actionType);
		event.dataTransfer.effectAllowed = "move";
	};

	return (
		<Card
			onDragStart={(event) => onDragStart(event, actionType)}
			style={{
				padding: "8px",
				cursor: "pointer",
				width: "100%",
				height: "40px",
				alignItems: "center",
				alignContent: "center",
			}}
			draggable
		>
			<Flex
				gap="2"
				align="center"
				justify="start"
				height="100%"
				width="100%"
			>
				{!hideIcon && <ActionIcon actionType={actionType} />}
				<Text
					size="2"
					weight="medium"
					style={{ color: "var(--Tokens-Colors-text, #1C2024)" }}
				>
					{label}
				</Text>
			</Flex>
		</Card>
	);
}
