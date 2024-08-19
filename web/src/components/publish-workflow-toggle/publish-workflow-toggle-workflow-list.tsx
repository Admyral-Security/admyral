import { useWorkflowsListStore } from "@/stores/workflows-list-store";
import PublishWorkflowToggleBase from "./publish-workflow-toggle-base";

export interface PublishWorkflowToggleWorkflowListProps {
	workflowId: string;
	isLive: boolean;
}

export default function PublishWorkflowToggleWorkflowList({
	workflowId,
	isLive,
}: PublishWorkflowToggleWorkflowListProps) {
	const { updateIsActiveState } = useWorkflowsListStore();
	return (
		<PublishWorkflowToggleBase
			workflowId={workflowId}
			isLive={isLive}
			updateIsLiveState={(newIsActive: boolean) =>
				updateIsActiveState(workflowId, newIsActive)
			}
		/>
	);
}
