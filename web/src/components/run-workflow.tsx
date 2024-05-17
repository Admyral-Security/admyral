"use client";

import { useEffect, useState } from "react";
import { ActionNode } from "@/lib/types";
import useWorkflowStore from "@/lib/workflow-store";
import { Cross1Icon, InfoCircledIcon, PlayIcon } from "@radix-ui/react-icons";
import {
	Button,
	Callout,
	Dialog,
	Flex,
	Select,
	Text,
	TextArea,
} from "@radix-ui/themes";
import { triggerWorkflowFromAction } from "@/lib/api";
import { triggerWorkflowWebhook } from "@/lib/api";

export interface RunWorkflowProps {
	workflowId: string;
	isWorkflowLive: boolean;
}

export default function RunWorkflow({
	workflowId,
	isWorkflowLive,
}: RunWorkflowProps) {
	const { startNodes, hasUnsavedChanges } = useWorkflowStore((state) => ({
		startNodes: state.nodes.filter(
			(node) =>
				node.data.actionType === ActionNode.WEBHOOK ||
				node.data.actionType === ActionNode.MANUAL_START,
		),
		hasUnsavedChanges: state.hasUnsavedChanges,
	}));

	const [startNodeIdx, setStartNodeIdx] = useState<number | null>(null);
	const [showModal, setShowModal] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);
	const [triggerPayload, setTriggerPayload] = useState<string>("");
	const [isExecuting, setIsExecuting] = useState<boolean>(false);

	useEffect(() => {
		if (startNodes.length > 0 && startNodeIdx === null) {
			setStartNodeIdx(0);
		} else if (startNodes.length === 0 && startNodeIdx !== null) {
			setStartNodeIdx(null);
		}
	}, [startNodes]);

	const executeWorkflow = async () => {
		setError(null);
		setIsExecuting(true);

		if (startNodeIdx === null || startNodeIdx >= startNodes.length) {
			return;
		}
		const node = startNodes[startNodeIdx];

		try {
			if (node.data.actionType === ActionNode.WEBHOOK) {
				await triggerWorkflowWebhook(
					node.data.webhookId!,
					node.data.secret!,
					triggerPayload.length > 0 ? triggerPayload : null,
				);
			}

			if (node.data.actionType === ActionNode.MANUAL_START) {
				await triggerWorkflowFromAction(
					workflowId,
					node.data.actionId,
					triggerPayload.length > 0 ? triggerPayload : null,
				);
			}

			setShowModal(false);
		} catch (error) {
			setError(
				`Failed to execute workflow. Please try again. If the problem persists, please contact us on Discord or via email ${process.env.NEXT_PUBLIC_SUPPORT_EMAIL}.`,
			);
		} finally {
			setIsExecuting(false);
		}
	};

	const unsavedChangesOrNotLive = !isWorkflowLive || hasUnsavedChanges();

	return (
		<Dialog.Root
			open={showModal}
			onOpenChange={(isOpen) => {
				setShowModal(isOpen);
				setError(null);
			}}
		>
			<Dialog.Trigger>
				<Button
					variant="solid"
					size="2"
					style={{
						cursor: "pointer",
					}}
				>
					<PlayIcon />
					Run
				</Button>
			</Dialog.Trigger>

			<Dialog.Content width="1054px">
				<Flex direction="column" gap="4" width="100%">
					<Flex justify="between" align="center">
						<Text weight="bold" size="5">
							Run Workflow
						</Text>

						<Dialog.Close>
							<Button
								size="2"
								variant="soft"
								color="gray"
								style={{
									cursor: "pointer",
									paddingLeft: 8,
									paddingRight: 8,
								}}
							>
								<Cross1Icon width="16" height="16" />
							</Button>
						</Dialog.Close>
					</Flex>

					<Flex>
						<Text size="3">
							Specify which execution path of the workflow should
							be executed. Add input parameters for the workflow
							if necessary.
						</Text>
					</Flex>

					{startNodeIdx === null && (
						<Callout.Root
							color="red"
							variant="surface"
							size="3"
							highContrast
						>
							<Callout.Icon>
								<InfoCircledIcon />
							</Callout.Icon>
							<Callout.Text size="3">
								Your workflow does not have a{" "}
								<b>Start Workflow</b> node. Please add a{" "}
								<b>Start Workflow</b> node to run the workflow.
							</Callout.Text>
						</Callout.Root>
					)}

					{startNodeIdx !== null &&
						(unsavedChangesOrNotLive ? (
							<Callout.Root
								color="red"
								variant="surface"
								size="3"
								highContrast
							>
								<Callout.Icon>
									<InfoCircledIcon />
								</Callout.Icon>
								<Callout.Text size="3">
									You have unsaved changes or your workflow is
									not live. Please make sure that you saved
									your changes and set your workflow to live
									to run it.
								</Callout.Text>
							</Callout.Root>
						) : (
							<>
								<Flex direction="column" gap="2">
									<Text>
										Select the Start Workflow Action
									</Text>

									<Flex width="70%" align="center">
										<Select.Root
											value={`${startNodeIdx}`}
											onValueChange={(value) =>
												setStartNodeIdx(
													parseInt(value, 10),
												)
											}
										>
											<Select.Trigger
												placeholder="Operator"
												style={{ width: "100%" }}
											/>
											<Select.Content>
												{startNodes.map(
													(node, index) => (
														<Select.Item
															key={node.id}
															value={`${index}`}
														>
															{
																node.data
																	.actionName
															}
														</Select.Item>
													),
												)}
											</Select.Content>
										</Select.Root>
									</Flex>
								</Flex>

								<Flex direction="column" gap="4">
									<Text size="4" weight="medium">
										Input Parameters
									</Text>

									<Text>
										Add input parameters in JSON format to
										run the workflow with.
									</Text>

									{startNodes[startNodeIdx].data
										.inputTemplates !== null &&
										startNodes[startNodeIdx].data
											.inputTemplates!.length > 0 && (
											<Flex direction="column" gap="2">
												<Text weight="medium">
													Input Parameter Templates
												</Text>
												<Select.Root
													value={""}
													onValueChange={(value) =>
														setTriggerPayload(value)
													}
												>
													<Select.Trigger
														placeholder="Select a template"
														style={{
															width: "100%",
														}}
													/>
													<Select.Content>
														{startNodes[
															startNodeIdx
														].data.inputTemplates!.map(
															(
																template,
																index,
															) => (
																<Select.Item
																	key={index}
																	value={
																		template.template
																	}
																>
																	{
																		template.templateName
																	}
																</Select.Item>
															),
														)}
													</Select.Content>
												</Select.Root>
											</Flex>
										)}

									<Flex direction="column" gap="2">
										<Text weight="medium">
											Enter parameters expected by your
											workflow.
										</Text>
										<TextArea
											value={triggerPayload}
											onChange={(event) =>
												setTriggerPayload(
													event.target.value,
												)
											}
											variant="surface"
											style={{
												width: "100%",
												height: "256px",
											}}
											placeholder={`Enter your parameters in JSON format, e.g.: { "hash": "8d3f68b16f0710f858d8c1d2c699260e6f43161a5510abb0e7ba567bd72c965b" }`}
										/>
									</Flex>

									{error !== null && (
										<Callout.Root
											color="red"
											variant="surface"
											size="3"
											highContrast
										>
											<Callout.Icon>
												<InfoCircledIcon />
											</Callout.Icon>
											<Callout.Text size="3">
												{error}
											</Callout.Text>
										</Callout.Root>
									)}

									<Flex align="center" justify="end" gap="4">
										<Dialog.Close>
											<Button
												variant="soft"
												color="gray"
												style={{ cursor: "pointer" }}
											>
												Cancel
											</Button>
										</Dialog.Close>

										<Button
											variant="solid"
											size="2"
											style={{
												cursor: "pointer",
											}}
											onClick={executeWorkflow}
											loading={isExecuting}
										>
											Run Workflow
										</Button>
									</Flex>
								</Flex>
							</>
						))}
				</Flex>
			</Dialog.Content>
		</Dialog.Root>
	);
}
