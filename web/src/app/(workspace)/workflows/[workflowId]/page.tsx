import WorkflowBuilder from "@/components/workflow-builder";
import { getWorkflow } from "@/lib/api";

export interface WorkflowPageProps {
	params: { workflowId: string };
}

export default async function WorkflowPage({
	params: { workflowId },
}: WorkflowPageProps) {
	const workflow = await getWorkflow(workflowId);

	return (
		<WorkflowBuilder
			workflowId={workflowId}
			workflowData={workflow.workflow}
			actionsData={workflow.actions}
			edgesData={workflow.edges}
		/>
	);
}
