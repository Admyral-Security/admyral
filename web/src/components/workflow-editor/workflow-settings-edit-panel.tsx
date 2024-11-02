"use client";

import {
	AlertDialog,
	Box,
	Button,
	Flex,
	Text,
	TextArea,
	TextField,
	IconButton,
} from "@radix-ui/themes";
import SettingsIcon from "../icons/settings-icon";
import WorkflowEditorRightPanelBase from "./right-panel-base";
import { useWorkflowStore } from "@/stores/workflow-store";
import { useDeleteWorkflowApi } from "@/hooks/use-delete-workflow-api";
import { useRouter } from "next/navigation";
import { TrashIcon, MinusIcon, PlusIcon } from "@radix-ui/react-icons";
import { useState } from "react";
import {
	isValidWorkflowName,
	WORKFLOW_NAME_VALIDATION_ERROR_MESSAGE,
} from "@/lib/workflow-validation";

export default function WorkflowSettingsEditPanel() {
	const {
		workflowId,
		workflowName,
		setWorkflowName,
		description,
		setDescription,
		controls,
		addControl,
		updateControlByIdx,
		deleteControlByIdx,
	} = useWorkflowStore();
	const deleteWorkflow = useDeleteWorkflowApi();
	const router = useRouter();

	const [validWorkflowName, setValidWorkflowName] = useState<boolean>(true);

	const handleDeleteWorkflow = async () => {
		await deleteWorkflow.mutateAsync(workflowId);
		router.push("/");
	};

	return (
		<WorkflowEditorRightPanelBase
			title="Workflow Settings"
			titleIcon={<SettingsIcon color="#1C2024" />}
		>
			<Flex direction="column" gap="4" p="4">
				<Flex direction="column" gap="2">
					<Text>Workflow Name</Text>
					<TextField.Root
						variant="surface"
						value={workflowName}
						onChange={(event) => {
							setWorkflowName(event.target.value);
							setValidWorkflowName(
								isValidWorkflowName(event.target.value),
							);
						}}
					/>
					{!validWorkflowName && (
						<Text color="red">
							{WORKFLOW_NAME_VALIDATION_ERROR_MESSAGE}
						</Text>
					)}
				</Flex>

				<Flex direction="column" gap="2">
					<Text>Workflow Description</Text>
					<TextArea
						size="2"
						variant="surface"
						resize="vertical"
						value={description || ""}
						style={{ height: "250px" }}
						onChange={(event) => setDescription(event.target.value)}
					/>
				</Flex>

				<Flex direction="column" gap="3">
					<Text>Controls</Text>
					{controls &&
						controls.map((control, controlIdx) => (
							<Flex
								key={`control_${controlIdx}`}
								direction="column"
								gap="1"
							>
								<Flex direction="column" gap="1">
									<Flex justify="between">
										<Text size="2" color="gray">
											Name of the Control
										</Text>
										<IconButton
											radius="full"
											color="red"
											size="1"
											style={{
												cursor: "pointer",
											}}
											onClick={() =>
												deleteControlByIdx(controlIdx)
											}
										>
											<MinusIcon />
										</IconButton>
									</Flex>
									<TextField.Root
										variant="surface"
										value={control}
										onChange={(event) =>
											updateControlByIdx(
												controlIdx,
												event.target.value,
											)
										}
									/>
								</Flex>
							</Flex>
						))}
					<Flex width="100%" justify="center" align="center">
						<IconButton
							radius="full"
							size="1"
							style={{ cursor: "pointer" }}
							onClick={addControl}
						>
							<PlusIcon />
						</IconButton>
					</Flex>
				</Flex>
				<Box width="auto">
					<AlertDialog.Root>
						<AlertDialog.Trigger>
							<Button
								style={{ cursor: "pointer" }}
								variant="soft"
								color="red"
								loading={deleteWorkflow.isPending}
							>
								<TrashIcon color="#e5484d" />
								Delete Workflow
							</Button>
						</AlertDialog.Trigger>

						<AlertDialog.Content>
							<AlertDialog.Title>
								Delete Workflow
							</AlertDialog.Title>
							<AlertDialog.Description size="2">
								Do you want to delete this workflow? This action
								cannot be undone.
							</AlertDialog.Description>

							<Flex gap="3" mt="4" justify="end">
								<AlertDialog.Cancel>
									<Button
										variant="soft"
										color="gray"
										style={{ cursor: "pointer" }}
									>
										Cancel
									</Button>
								</AlertDialog.Cancel>
								<AlertDialog.Action>
									<Button
										loading={deleteWorkflow.isPending}
										variant="solid"
										color="red"
										style={{ cursor: "pointer" }}
										onClick={handleDeleteWorkflow}
									>
										Delete Worfklow
									</Button>
								</AlertDialog.Action>
							</Flex>
						</AlertDialog.Content>
					</AlertDialog.Root>
				</Box>
			</Flex>
		</WorkflowEditorRightPanelBase>
	);
}
