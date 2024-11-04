import { useToast } from "@/providers/toast";
import { Flex, Switch, Text } from "@radix-ui/themes";
import { usePublishWorkflowApi } from "@/hooks/use-publish-workflow-api";
import { useEffect } from "react";

export interface PublishWorkflowToggleBaseProps {
	workflowId: string;
	isLive: boolean;
	updateIsLiveState: (newIsLive: boolean) => void;
}

export default function PublishWorkflowToggleBase({
	workflowId,
	isLive,
	updateIsLiveState,
}: PublishWorkflowToggleBaseProps) {
	const { infoToast } = useToast();
	const publishWorkflow = usePublishWorkflowApi();

	useEffect(() => {
		if (publishWorkflow.isSuccess && isLive !== publishWorkflow.data) {
			updateIsLiveState(publishWorkflow.data);
			publishWorkflow.reset();
			infoToast(
				publishWorkflow.data
					? "Workflow is activated."
					: "Workflow is deactivated.",
			);
		}
	}, [publishWorkflow, isLive, updateIsLiveState]);

	return (
		<Flex justify="start" gap="3" align="center">
			<Switch
				disabled={publishWorkflow.isPending}
				checked={isLive}
				onCheckedChange={() =>
					publishWorkflow.mutate({
						workflowId,
						newActivationState: !isLive,
					})
				}
				style={{
					cursor: "pointer",
				}}
			/>
			<Text>{isLive ? "Active" : "Inactive"}</Text>
		</Flex>
	);
}
