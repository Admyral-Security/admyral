"use client";

import { Button } from "@radix-ui/themes";
import { DiscIcon } from "@radix-ui/react-icons";
import useSaveWorkflow from "@/providers/save-workflow";

export default function SaveWorkflowButton() {
	const { saveWorkflow, isPending } = useSaveWorkflow();

	return (
		<Button
			variant="solid"
			size="2"
			onClick={saveWorkflow}
			style={{
				cursor: "pointer",
			}}
			loading={isPending}
		>
			<DiscIcon />
			Save
		</Button>
	);
}
