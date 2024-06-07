"use client";

import { Button } from "@radix-ui/themes";
import useGettingStartedDialog from "@/providers/getting-started-provider";

export default function CreateNewWorkflowButton() {
	const { openGettingStartedDialog } = useGettingStartedDialog();
	return (
		<Button
			size="2"
			variant="solid"
			style={{ cursor: "pointer" }}
			onClick={openGettingStartedDialog}
		>
			Create New Workflow
		</Button>
	);
}
