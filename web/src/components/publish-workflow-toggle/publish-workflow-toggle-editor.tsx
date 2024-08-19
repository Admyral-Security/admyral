import PublishWorkflowToggleBase from "./publish-workflow-toggle-base";
import { useWorkflowStore } from "@/stores/workflow-store";

export default function PublishWorkflowToggleEditor() {
	const { workflowId, isActive, setIsActive } = useWorkflowStore();
	return (
		<PublishWorkflowToggleBase
			workflowId={workflowId}
			isLive={isActive}
			updateIsLiveState={setIsActive}
		/>
	);
}
