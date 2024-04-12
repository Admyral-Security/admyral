export default function WorkflowPage({
	params: { workflowId },
}: {
	params: { workflowId: string };
}) {
	return (
		<div>
			<p>Workflow Builder: {workflowId}</p>
			<p>You can also view the run history here</p>
		</div>
	);
}
