"use client";

import { useCreateWorkflow } from "@/hooks/use-create-workflow";
import { isValidWorkflowName } from "@/lib/workflow-validation";
import { useWorkflowStore } from "@/stores/workflow-store";
import {
	Button,
	Dialog,
	Flex,
	Separator,
	Text,
	TextField,
} from "@radix-ui/themes";
import { useRouter } from "next/navigation";
import { useState } from "react";
import FileUpload from "../file-upload/file-upload";

export default function NewWorkflowModal() {
	const router = useRouter();
	const { isNew, workflowName, setWorkflowName } = useWorkflowStore();
	const { createWorkflow, isPending, errorMessage } = useCreateWorkflow();
	const [validWorkflowName, setValidWorkflowName] = useState<boolean>(true);

	const handleCancelWorkflow = () => router.push("/");

	return (
		<Dialog.Root open={isNew}>
			<Dialog.Content maxWidth="550px">
				<Dialog.Title>New Workflow</Dialog.Title>
				<Dialog.Description size="2" mb="4">
					Give your workflow a unique name. The workflow name must
					start with a letter. After the first letter, the name must
					only contain letters, numbers, and spaces.
				</Dialog.Description>

				<Flex direction="column" width="100%" gap="4">
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

				{errorMessage && (
					<Text as="div" size="2" mb="1" weight="bold" color="red">
						{errorMessage}
					</Text>
				)}

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
						onClick={createWorkflow}
					>
						Create Workflow
					</Button>
				</Flex>

				<Flex width="100%" justify="center" align="center" my="6">
					<Flex width="45%" pr="2">
						<Separator orientation="horizontal" size="4" />
					</Flex>
					<Text color="gray">OR</Text>
					<Flex width="45%" pl="2">
						<Separator orientation="horizontal" size="4" />
					</Flex>
				</Flex>

				<Flex direction="column" width="100%" gap="4">
					<Text as="div" size="4" mb="1" weight="bold">
						Import Workflow
					</Text>
					<FileUpload fileType="workflow in YAML format" />
				</Flex>
			</Dialog.Content>
		</Dialog.Root>
	);
}
