import { publishWorkflow } from "@/lib/api";
import { Flex, Switch, Text } from "@radix-ui/themes";
import { useState } from "react";

export interface PublishWorkflowToggleProps {
	workflowId: string;
	isLive: boolean;
	beforeUpdate?: () => void;
	onSuccess: () => void;
	onError: () => void;
}

export default function PublishWorkflowToggle({
	workflowId,
	isLive,
	beforeUpdate,
	onSuccess,
	onError,
}: PublishWorkflowToggleProps) {
	const [isUpdating, setIsUpdating] = useState(false);

	const handleIsLiveChange = async (newIsLive: boolean) => {
		try {
			setIsUpdating(true);
			if (beforeUpdate) {
				beforeUpdate();
			}
			await publishWorkflow(workflowId, newIsLive);
			onSuccess();
		} catch (error) {
			onError();
		} finally {
			setIsUpdating(false);
		}
	};

	return (
		<Flex justify="start" gap="3" align="center">
			<Switch
				disabled={isUpdating}
				checked={isLive}
				onCheckedChange={handleIsLiveChange}
				style={{
					cursor: "pointer",
				}}
			/>
			<Text>{isLive ? "Active" : "Inactive"}</Text>
		</Flex>
	);
}
