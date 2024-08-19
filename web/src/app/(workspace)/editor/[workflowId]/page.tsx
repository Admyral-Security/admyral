import WorkflowEditor from "@/components/workflow-editor/workflow-editor";
import { API_BASE_URL } from "@/constants/env";

export default async function EditorPage({
	params: { workflowId },
}: {
	params: { workflowId: string };
}) {
	return <WorkflowEditor workflowId={workflowId} apiBaseUrl={API_BASE_URL} />;
}
