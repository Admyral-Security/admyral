import WorkflowBuilder from "@/components/workflow-builder";

export interface WorkflowPageProps {
	params: { workflowId: string };
}

export default async function WorkflowPage({
	params: { workflowId },
}: WorkflowPageProps) {
	return <WorkflowBuilder workflowId={workflowId} />;
}
