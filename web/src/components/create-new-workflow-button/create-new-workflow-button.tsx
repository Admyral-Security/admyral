"use client";

import { Button } from "@radix-ui/themes";
import { useWorkflowStore } from "@/stores/workflow-store";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";

export default function CreateNewWorkflowButton() {
	const router = useRouter();
	const { initWorkflow } = useWorkflowStore();

	const handleCreateNewWorkflow = () => {
		const workflowId = uuidv4();
		initWorkflow(workflowId, window.innerWidth);
		router.push(`/editor/${workflowId}`);
	};

	return (
		<Button
			size="2"
			variant="solid"
			style={{ cursor: "pointer" }}
			onClick={handleCreateNewWorkflow}
		>
			New Workflow
		</Button>
	);
}
