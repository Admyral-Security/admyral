import { Flex, Switch, Text } from "@radix-ui/themes";

export interface PublishWorkflowToggleProps {
	isLive: boolean;
	onIsLiveChange: (newIsLive: boolean) => void;
}

export default function PublishWorkflowToggle({
	isLive,
	onIsLiveChange,
}: PublishWorkflowToggleProps) {
	return (
		<Flex justify="start" gap="3" align="center">
			<Switch
				checked={isLive}
				onCheckedChange={onIsLiveChange}
				style={{ cursor: "pointer" }}
			/>
			<Text>{isLive ? "Active" : "Inactive"}</Text>
		</Flex>
	);
}
