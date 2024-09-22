import { useWorkflowStore } from "@/stores/workflow-store";
import WorkflowEditorRightPanelBase from "../right-panel-base";
import {
	Flex,
	IconButton,
	Select,
	Separator,
	Text,
	TextField,
} from "@radix-ui/themes";
import StartWorkflowActionIcon from "@/components/icons/start-workflow-icon";
import {
	ScheduleType,
	SCHEDULE_TYPES,
	TEditorWorkflowStartNode,
} from "@/types/react-flow";
import { MinusIcon, PlusIcon } from "@radix-ui/react-icons";
import CopyText from "@/components/utils/copy-text";
import { produce } from "immer";

export default function StartActionEditPanel({
	apiBaseUrl,
}: {
	apiBaseUrl: string;
}) {
	const { nodes, selectedNodeIdx, updateNodeData, webhookId, webhookSecret } =
		useWorkflowStore();

	if (selectedNodeIdx === null) {
		return null;
	}

	const action = nodes[selectedNodeIdx];
	const actionData = action.data as TEditorWorkflowStartNode;

	// WEBHOOK HANDLERS

	const addWebhook = () => {
		updateNodeData(
			selectedNodeIdx,
			produce(actionData, (draft) => {
				draft.webhook = {
					webhookId,
					webhookSecret,
					defaultArgs: [],
				};
			}),
		);
	};

	const removeWebhook = () => {
		updateNodeData(
			selectedNodeIdx,
			produce(actionData, (draft) => {
				draft.webhook = null;
			}),
		);
	};

	const addWebhookDefaultArg = () => {
		updateNodeData(
			selectedNodeIdx,
			produce(actionData, (draft) => {
				draft.webhook!.defaultArgs.push(["", ""]);
			}),
		);
	};

	const removeWebhookDefaultArg = (idx: number) => {
		updateNodeData(
			selectedNodeIdx,
			produce(actionData, (draft) => {
				draft.webhook!.defaultArgs.splice(idx, 1);
			}),
		);
	};

	const handleWebhookDefaultArgName = (idx: number, event: string) => {
		updateNodeData(
			selectedNodeIdx,
			produce(actionData, (draft) => {
				draft.webhook!.defaultArgs[idx][0] = event;
			}),
		);
	};

	const handleWebhookDefaultArgValue = (idx: number, event: string) => {
		updateNodeData(
			selectedNodeIdx,
			produce(actionData, (draft) => {
				draft.webhook!.defaultArgs[idx][1] = event;
			}),
		);
	};

	// SCHEDULE HANDLERS

	const addSchedule = () => {
		updateNodeData(
			selectedNodeIdx,
			produce(actionData, (draft) => {
				// Prepend new schedule
				draft.schedules.unshift({
					scheduleType: ScheduleType.INTERVAL_SECONDS,
					value: "",
					defaultArgs: [],
				});
			}),
		);
	};

	const handleScheduleType = (
		scheduleIdx: number,
		newScheduleType: ScheduleType,
	) => {
		updateNodeData(
			selectedNodeIdx,
			produce(actionData, (draft) => {
				draft.schedules[scheduleIdx].scheduleType = newScheduleType;
			}),
		);
	};

	const removeSchedule = (scheduleIdx: number) => {
		updateNodeData(
			selectedNodeIdx,
			produce(actionData, (draft) => {
				draft.schedules.splice(scheduleIdx, 1);
			}),
		);
	};

	const addScheduleDefaultArg = (scheduleIdx: number) => {
		updateNodeData(
			selectedNodeIdx,
			produce(actionData, (draft) => {
				draft.schedules[scheduleIdx].defaultArgs.push(["", ""]);
			}),
		);
	};

	const removeScheduleDefaultArg = (
		scheduleIdx: number,
		defaultArgIdx: number,
	) => {
		updateNodeData(
			selectedNodeIdx,
			produce(actionData, (draft) => {
				draft.schedules[scheduleIdx].defaultArgs.splice(
					defaultArgIdx,
					1,
				);
			}),
		);
	};

	const handleSchduleValue = (scheduleIdx: number, event: string) => {
		updateNodeData(
			selectedNodeIdx,
			produce(actionData, (draft) => {
				draft.schedules[scheduleIdx].value = event;
			}),
		);
	};

	const handleScheduleDefaultArgName = (
		scheduleIdx: number,
		defaultArgIdx: number,
		event: string,
	) => {
		updateNodeData(
			selectedNodeIdx,
			produce(actionData, (draft) => {
				draft.schedules[scheduleIdx].defaultArgs[defaultArgIdx][0] =
					event;
			}),
		);
	};

	const handleScheduleDefaultArgValue = (
		scheduleIdx: number,
		defaultArgIdx: number,
		event: string,
	) => {
		updateNodeData(
			selectedNodeIdx,
			produce(actionData, (draft) => {
				draft.schedules[scheduleIdx].defaultArgs[defaultArgIdx][1] =
					event;
			}),
		);
	};

	return (
		<WorkflowEditorRightPanelBase
			title={"Start Workflow"}
			titleIcon={<StartWorkflowActionIcon />}
		>
			<Flex direction="column" gap="4" p="4" width="100%">
				<Flex direction="column" gap="2">
					<Text>Result Name</Text>
					<TextField.Root
						variant="surface"
						value="payload"
						disabled
					/>
				</Flex>

				<Flex width="100%">
					<Separator orientation="horizontal" size="4" />
				</Flex>

				{/* WEBHOOK */}

				<Flex direction="column" gap="2">
					<Flex justify="between" align="center">
						<Text>Webhook</Text>
						{actionData.webhook === null ? (
							<IconButton
								variant="soft"
								color="gray"
								style={{ cursor: "pointer" }}
								onClick={addWebhook}
							>
								<PlusIcon />
							</IconButton>
						) : (
							<IconButton
								variant="soft"
								color="red"
								style={{ cursor: "pointer" }}
								onClick={removeWebhook}
							>
								<MinusIcon />
							</IconButton>
						)}
					</Flex>

					<Flex>
						<Text size="2" color="gray">
							Trigger the workflow from other tools via an API
							call using the API URL.
						</Text>
					</Flex>

					{actionData.webhook && (
						<Flex direction="column" gap="2">
							<Text size="2" color="gray">
								Webhook URL
							</Text>
							<CopyText
								text={
									actionData.webhook!.webhookId
										? `${apiBaseUrl}/webhooks/${actionData.webhook!.webhookId}/${actionData!.webhook.webhookSecret}`
										: ""
								}
							/>
							{actionData.webhook!.webhookSecret === null && (
								<Text size="1" color="red">
									You must first save the workflow to get the
									webhook URL and secret.
								</Text>
							)}
						</Flex>
					)}

					{actionData.webhook?.defaultArgs && (
						<Flex direction="column" gap="3">
							<Text size="2">Default Arguments</Text>
							{actionData.webhook!.defaultArgs.map(
								(defaultArg, defaultArgIdx) => (
									<Flex
										key={`webhook_default_arg_${defaultArgIdx}`}
										direction="column"
										gap="1"
									>
										<Flex direction="column" gap="1">
											<Flex justify="between">
												<Text size="2" color="gray">
													Argument Name
												</Text>

												<IconButton
													radius="full"
													color="red"
													size="1"
													style={{
														cursor: "pointer",
													}}
													onClick={() =>
														removeWebhookDefaultArg(
															defaultArgIdx,
														)
													}
												>
													<MinusIcon />
												</IconButton>
											</Flex>

											<TextField.Root
												variant="surface"
												value={defaultArg[0]}
												onChange={(event) =>
													handleWebhookDefaultArgName(
														defaultArgIdx,
														event.target.value,
													)
												}
											/>
										</Flex>
										<Flex direction="column" gap="1">
											<Text size="2" color="gray">
												Default Value
											</Text>
											<TextField.Root
												variant="surface"
												value={defaultArg[1]}
												onChange={(event) =>
													handleWebhookDefaultArgValue(
														defaultArgIdx,
														event.target.value,
													)
												}
											/>
										</Flex>
									</Flex>
								),
							)}

							<Flex width="100%" justify="center" align="center">
								<IconButton
									radius="full"
									size="1"
									style={{ cursor: "pointer" }}
									onClick={addWebhookDefaultArg}
								>
									<PlusIcon />
								</IconButton>
							</Flex>
						</Flex>
					)}
				</Flex>

				<Flex width="100%">
					<Separator orientation="horizontal" size="4" />
				</Flex>

				{/* SCHEDULES */}

				<Flex direction="column" width="100%">
					<Flex gap="4" justify="between" align="center">
						<Text>Schedules</Text>
						<IconButton
							variant="soft"
							color="gray"
							style={{ cursor: "pointer" }}
							onClick={addSchedule}
						>
							<PlusIcon />
						</IconButton>
					</Flex>

					<Flex>
						<Text size="2" color="gray">
							Run the workflow in regular intervals.
						</Text>
					</Flex>

					{actionData.schedules.map((schedule, scheduleIdx) => (
						<Flex
							key={`schedule_${scheduleIdx}`}
							direction="column"
							gap="2"
							width="100%"
							mt="4"
							mb="6"
						>
							<Text size="2" color="gray">
								Run every
							</Text>
							<Flex
								gap="2"
								width="100%"
								justify="between"
								align="center"
							>
								<Flex>
									<Select.Root
										defaultValue={
											ScheduleType.INTERVAL_SECONDS
										}
										onValueChange={(value) =>
											handleScheduleType(
												scheduleIdx,
												value as ScheduleType,
											)
										}
										value={schedule.scheduleType}
									>
										<Select.Trigger
											style={{ width: "152px" }}
										/>
										<Select.Content>
											{SCHEDULE_TYPES.map(
												(scheduleType) => (
													<Select.Item
														key={`schedule_${scheduleIdx}_${scheduleType}`}
														value={scheduleType}
													>
														{scheduleType}
													</Select.Item>
												),
											)}
										</Select.Content>
									</Select.Root>
								</Flex>

								<Flex>
									<TextField.Root
										placeholder="Schedule interval..."
										value={schedule.value}
										onChange={(event) =>
											handleSchduleValue(
												scheduleIdx,
												event.target.value,
											)
										}
									/>
								</Flex>

								<Flex justify="center" align="center">
									<IconButton
										variant="soft"
										color="red"
										style={{ cursor: "pointer" }}
										onClick={() =>
											removeSchedule(scheduleIdx)
										}
									>
										<MinusIcon />
									</IconButton>
								</Flex>
							</Flex>

							{schedule.defaultArgs && (
								<Flex direction="column" gap="3">
									<Text size="2">Default Arguments</Text>
									{schedule.defaultArgs.map(
										(defaultArg, defaultArgIdx) => (
											<Flex
												key={`schedule_${scheduleIdx}_default_arg_${defaultArgIdx}`}
												direction="column"
												gap="1"
											>
												<Flex
													direction="column"
													gap="1"
												>
													<Flex justify="between">
														<Text
															size="2"
															color="gray"
														>
															Argument Name
														</Text>

														<IconButton
															radius="full"
															color="red"
															size="1"
															style={{
																cursor: "pointer",
															}}
															onClick={() =>
																removeScheduleDefaultArg(
																	scheduleIdx,
																	defaultArgIdx,
																)
															}
														>
															<MinusIcon />
														</IconButton>
													</Flex>

													<TextField.Root
														variant="surface"
														value={defaultArg[0]}
														onChange={(event) =>
															handleScheduleDefaultArgName(
																scheduleIdx,
																defaultArgIdx,
																event.target
																	.value,
															)
														}
													/>
												</Flex>
												<Flex
													direction="column"
													gap="1"
												>
													<Text size="2" color="gray">
														Default Value
													</Text>
													<TextField.Root
														variant="surface"
														value={defaultArg[1]}
														onChange={(event) =>
															handleScheduleDefaultArgValue(
																scheduleIdx,
																defaultArgIdx,
																event.target
																	.value,
															)
														}
													/>
												</Flex>
											</Flex>
										),
									)}

									<Flex
										width="100%"
										justify="center"
										align="center"
									>
										<IconButton
											radius="full"
											size="1"
											style={{ cursor: "pointer" }}
											onClick={() =>
												addScheduleDefaultArg(
													scheduleIdx,
												)
											}
										>
											<PlusIcon />
										</IconButton>
									</Flex>
								</Flex>
							)}
						</Flex>
					))}
				</Flex>
			</Flex>
		</WorkflowEditorRightPanelBase>
	);
}
