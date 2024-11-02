"use client";

import { isValidWorkflowName } from "@/lib/workflow-validation";
import useSaveWorkflow from "@/providers/save-workflow";
import { useWorkflowStore } from "@/stores/workflow-store";
import { Button, Dialog, Flex, Text, TextField } from "@radix-ui/themes";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function NewWorkflowModal() {
	const router = useRouter();
	const { isNew, setIsNew, workflowName, setWorkflowName } =
		useWorkflowStore();
	const { saveWorkflow, isPending } = useSaveWorkflow();
	const [validWorkflowName, setValidWorkflowName] = useState<boolean>(true);

	const handleCancelWorkflow = () => router.push("/");

	const handleCreateWorkflow = async () => {
		await saveWorkflow();
		setIsNew(false);
	};

	return (
		<Dialog.Root open={isNew}>
			<Dialog.Content maxWidth="550px">
				<Dialog.Title>New Workflow</Dialog.Title>
				<Dialog.Description size="2" mb="4">
					Give your workflow a unique name. The workflow name must
					start with a letter. After the first letter, the name must
					only contain letters, numbers, and spaces.
				</Dialog.Description>

				<Flex direction="column" width="100%">
					<label>
						<Text as="div" size="2" mb="1" weight="bold">
							Workflow Name
						</Text>
						<TextField.Root
							placeholder="Enter your unique workflow name..."
							value={workflowName}
							onChange={(event) => {
								setWorkflowName(event.target.value);
								setValidWorkflowName(
									isValidWorkflowName(event.target.value),
								);
							}}
						/>
						{!validWorkflowName && (
							<Text
								as="div"
								size="1"
								mb="1"
								weight="bold"
								color="red"
							>
								Invalid workflow name
							</Text>
						)}
					</label>
				</Flex>

				<Flex gap="3" mt="4" justify="end">
					<Button
						variant="soft"
						color="gray"
						style={{ cursor: "pointer" }}
						onClick={handleCancelWorkflow}
						disabled={isPending}
					>
						Cancel
					</Button>
					<Button
						disabled={
							workflowName.length === 0 || !validWorkflowName
						}
						style={{ cursor: "pointer" }}
						loading={isPending}
						onClick={handleCreateWorkflow}
					>
						Create Workflow
					</Button>
				</Flex>
			</Dialog.Content>
		</Dialog.Root>
	);
}
