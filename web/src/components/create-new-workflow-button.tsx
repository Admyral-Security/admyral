"use client";

import { createNewWorkflow } from "@/lib/api";
import { Button } from "@radix-ui/themes";
import { useEffect, useState } from "react";

export interface CreateNewWorkflowButtonProps {
	size: "1" | "2" | "3" | "4";
}

export default function CreateNewWorkflowButton({
	size,
}: CreateNewWorkflowButtonProps) {
	const [doCreateNewWorkflow, setDoCreateNewWorkflow] =
		useState<boolean>(false);
	const [loading, setLoading] = useState<boolean>(false);

	useEffect(() => {
		if (!doCreateNewWorkflow) {
			return;
		}

		setLoading(true);
		createNewWorkflow();
	}, [doCreateNewWorkflow]);

	return (
		<Button
			loading={loading}
			size={size}
			variant="solid"
			style={{ cursor: "pointer" }}
			onClick={() => setDoCreateNewWorkflow(true)}
		>
			Create New Workflow
		</Button>
	);
}
