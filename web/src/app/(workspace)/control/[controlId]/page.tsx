"use client";

import BackIcon from "@/components/icons/back-icon";
import ErrorCallout from "@/components/utils/error-callout";
import {
	Badge,
	Grid,
	IconButton,
	Select,
	TextArea,
	TextField,
} from "@radix-ui/themes";
import { useGetControl } from "@/hooks/use-get-control";
import { Button, Link } from "@radix-ui/themes";
import { Box } from "@radix-ui/themes";
import { Flex } from "@radix-ui/themes";
import { Text } from "@radix-ui/themes";
import { useParams } from "next/navigation";
import { useListWorkflowsApi } from "@/hooks/use-list-workflows-api";
import { TControlDetails } from "@/types/controls";
import { useEffect, useState } from "react";
import { MinusIcon } from "@radix-ui/react-icons";
import { useImmer } from "use-immer";
import { useSaveControl } from "@/hooks/use-save-control";
import { useToast } from "@/providers/toast";

export default function ControlPage() {
	const { controlId } = useParams();
	const {
		data: controlDetails,
		isPending,
		error,
	} = useGetControl(controlId as string);
	const {
		data: workflows,
		isPending: workflowsPending,
		error: listWorkflowsError,
	} = useListWorkflowsApi();
	const saveControl = useSaveControl(controlId as string);
	const { errorToast, successToast } = useToast();
	const [controlState, setControlState] = useImmer<TControlDetails | null>(
		null,
	);
	const [selectedWorkflowIdx, setSelectedWorkflowIdx] = useState<
		number | null
	>(null);
	const [isSaving, setIsSaving] = useState(false);

	useEffect(() => {
		if (controlDetails) {
			setControlState(controlDetails as TControlDetails);
		}
	}, [controlDetails, setControlState]);

	if (isPending || workflowsPending) {
		return <div>Loading...</div>;
	}

	if (error || listWorkflowsError) {
		return <ErrorCallout />;
	}

	const handleSaveControl = async () => {
		if (!controlState) {
			errorToast("No control state to save.");
			return;
		}

		try {
			setIsSaving(true);
			await saveControl.mutateAsync(controlState!);
			successToast("Control saved successfully.");
		} catch (error) {
			console.error(error);
			errorToast("Failed to save control. Please try again.");
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<Grid rows="56px 1fr" width="auto" height="100%">
			<Box width="100%" height="100%">
				<Flex
					pb="2"
					pt="2"
					pl="4"
					pr="4"
					justify="between"
					align="center"
					className="border-b-2 border-gray-200"
					height="56px"
					width="calc(100% - 56px)"
					style={{
						position: "fixed",
						zIndex: 100,
						backgroundColor: "white",
					}}
				>
					<Flex align="center" justify="start" gap="4">
						<Link href="/policies/controls">
							<BackIcon />
						</Link>
						<Text size="4" weight="medium">
							{controlState ? controlState.control.name : ""}
						</Text>
					</Flex>

					<Flex align="center" justify="end" gap="2">
						<Button color="red" style={{ cursor: "pointer" }}>
							Delete
						</Button>
						<Button
							style={{ cursor: "pointer" }}
							disabled={isSaving}
							onClick={handleSaveControl}
						>
							Save
						</Button>
					</Flex>
				</Flex>
			</Box>

			<Flex width="100%" height="100%" direction="column" gap="4" p="4">
				<Flex direction="column" gap="4" width="50%">
					<Text size="3" weight="medium">
						ID
					</Text>
					<TextField.Root
						value={controlState ? controlState.control.id : ""}
					/>
				</Flex>

				<Flex direction="column" gap="1" width="50%">
					<Text size="3" weight="medium">
						Name
					</Text>
					<TextField.Root
						value={controlState ? controlState.control.name : ""}
						onChange={(event) => {
							setControlState((draft) => {
								if (draft) {
									draft.control.name = event.target.value;
								}
							});
						}}
					/>
				</Flex>

				<Flex direction="column" gap="1" width="50%">
					<Text size="3" weight="medium">
						Description
					</Text>
					<Flex direction="column" gap="1">
						<TextArea
							value={
								controlState
									? controlState.control.description
									: ""
							}
							resize="vertical"
							onChange={(event) => {
								setControlState((draft) => {
									if (draft) {
										draft.control.description =
											event.target.value;
									}
								});
							}}
						/>
					</Flex>
				</Flex>

				<Flex direction="column" gap="2" width="50%">
					<Text size="3" weight="medium">
						Frameworks
					</Text>

					<Flex gap="2" direction="column">
						{controlState?.control.frameworks.map((framework) => (
							<Flex
								key={`control-state-${framework}`}
								gap="1"
								align="center"
							>
								<Badge size="2">{framework}</Badge>
								<IconButton
									variant="soft"
									color="red"
									style={{ cursor: "pointer" }}
									size="1"
								>
									<MinusIcon />
								</IconButton>
							</Flex>
						))}
					</Flex>

					<Flex gap="1">
						<Select.Root>
							<Select.Trigger placeholder="Select Framework" />
							<Select.Content>
								{["SOC2"].map((framework) => (
									<Select.Item
										key={framework}
										value={framework}
									>
										{framework}
									</Select.Item>
								))}
							</Select.Content>
						</Select.Root>

						<Button style={{ cursor: "pointer" }} disabled>
							Add
						</Button>
					</Flex>
				</Flex>

				<Flex direction="column" gap="4" width="50%">
					<Text size="3" weight="medium">
						Connected Workflows
					</Text>

					{controlState?.workflows.map((workflow, idx) => (
						<Flex gap="1" key={idx}>
							<Link href={`/editor/${workflow.workflowId}`}>
								{workflow.workflowName}
							</Link>

							<IconButton
								variant="soft"
								color="red"
								style={{ cursor: "pointer" }}
								size="1"
								onClick={() => {
									setControlState((draft) => {
										if (draft) {
											draft.workflows.splice(idx, 1);
										}
									});
								}}
							>
								<MinusIcon />
							</IconButton>
						</Flex>
					))}

					<Flex gap="1">
						<Select.Root
							value={
								selectedWorkflowIdx !== null
									? workflows?.[selectedWorkflowIdx]
											.workflowId
									: ""
							}
							onValueChange={(value) => {
								setSelectedWorkflowIdx(
									workflows?.findIndex(
										(workflow) =>
											workflow.workflowId === value,
									),
								);
							}}
						>
							<Select.Trigger placeholder="Select Workflow" />
							<Select.Content>
								{workflows?.map((workflow) => (
									<Select.Item
										key={`map-workflow-${workflow.workflowId}`}
										value={workflow.workflowId}
									>
										{workflow.workflowName}
									</Select.Item>
								))}
							</Select.Content>
						</Select.Root>

						<Button
							disabled={selectedWorkflowIdx === null}
							style={{ cursor: "pointer" }}
							onClick={() => {
								setControlState((draft) => {
									if (draft && selectedWorkflowIdx !== null) {
										draft.workflows.push({
											workflowId:
												workflows?.[selectedWorkflowIdx]
													.workflowId,
											workflowName:
												workflows?.[selectedWorkflowIdx]
													.workflowName,
										});
									}
								});
								setSelectedWorkflowIdx(null);
							}}
						>
							Add
						</Button>
					</Flex>
				</Flex>
			</Flex>
		</Grid>
	);
}
