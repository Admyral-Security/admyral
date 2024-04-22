"use client";

import { createNewWorkflow } from "@/lib/api";
import { Button } from "@radix-ui/themes";
import { useState } from "react";

export interface CreateNewWorkflowButtonProps {
	size: "1" | "2" | "3" | "4";
}

export default function CreateNewWorkflowButton({
	size,
}: CreateNewWorkflowButtonProps) {
	const [loading, setLoading] = useState<boolean>(false);

	const handleCreateNewWorkflow = async () => {
		setLoading(true);
		try {
			await createNewWorkflow();
		} catch (error) {
			alert("Failed to create new workflow. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	return (
		<Button
			loading={loading}
			size={size}
			variant="solid"
			style={{ cursor: "pointer" }}
			onClick={handleCreateNewWorkflow}
		>
			Create New Workflow
		</Button>
	);
}
