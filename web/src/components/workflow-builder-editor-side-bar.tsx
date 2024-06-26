"use client";

import { ActionNode, getActionNodeLabel } from "@/lib/types";
import { Badge, Box, Card, Flex, HoverCard, Text } from "@radix-ui/themes";
import TransformActionIcon from "./icons/transform-action-icon";
import IfConditionActionIcon from "./icons/if-condition-action-icon";
import AiActionsIcon from "./icons/ai-actions-icon";
import SendEmailActionIcon from "./icons/send-email-action-icon";
import ReceiveEmailActionIcon from "./icons/receive-email-action-icon";
import CreateCaseIcon from "./icons/create-case-icon";
import UpdateCaseIcon from "./icons/update-case-icon";
import QueryCasesIcon from "./icons/query-cases-icon";
import CaseTriggerIcon from "./icons/case-trigger-icon";
import WorkflowTemplates from "./workflow-templates";
import NoteActionIcon from "./icons/note-action-icon";
import StartWorkflowActionIcon from "./icons/start-workflow-action-icon";
import WorkflowAssistantButton from "./workflow-assistant-button";
import WorkflowAssistant from "./workflow-assistant";
import useWorkflowAssistantStore from "@/lib/workflow-assistant-store";
import IntegrationIcon from "./icons/integration-icon";

interface EditorCardProps {
	icon: React.ReactNode;
	label: string;
	isComingSoon?: boolean;
}

function EditorCard({ icon, label, isComingSoon = false }: EditorCardProps) {
	if (isComingSoon) {
		return (
			<HoverCard.Root>
				<HoverCard.Trigger>
					<Card
						style={{
							padding: "8px",
							cursor: "pointer",
							width: "95%",
						}}
					>
						<Flex gap="2">
							{icon}
							<Text size="3" weight="medium">
								{label}
							</Text>
						</Flex>
					</Card>
				</HoverCard.Trigger>

				<HoverCard.Content style={{ padding: 0 }}>
					<Badge size="3" color="green">
						Coming soon
					</Badge>
				</HoverCard.Content>
			</HoverCard.Root>
		);
	}

	return (
		<Card
			style={{
				padding: "8px",
				cursor: "pointer",
				width: "95%",
			}}
			draggable
		>
			<Flex gap="2">
				{icon}
				<Text size="3" weight="medium">
					{label}
				</Text>
			</Flex>
		</Card>
	);
}

export default function EditorSideBar() {
	const { isAssistantOpen, setIsAssistantOpen } = useWorkflowAssistantStore(
		(state) => ({
			isAssistantOpen: state.openAssistant,
			setIsAssistantOpen: state.setOpenAssistant,
		}),
	);

	const onDragStart = (event: any, nodeType: string) => {
		event.dataTransfer.setData("application/reactflow", nodeType);
		event.dataTransfer.effectAllowed = "move";
	};

	return (
		<>
			<Card
				style={{
					position: "fixed",
					left: "68px",
					top: "68px",
					zIndex: 50,
					width: "232px",
					backgroundColor: "white",
					height: "calc(99vh - 68px)",
					padding: 0,
				}}
				size="4"
			>
				<Flex
					direction="column"
					justify="between"
					height="100%"
					pt="5"
					pl="4"
					pr="4"
					pb="4"
					style={{
						display: "flex",
						flexDirection: "column",
					}}
				>
					<Flex
						direction="column"
						gap="4"
						height="100%"
						style={{ flex: 1, overflowY: "auto" }}
					>
						<Flex>
							<WorkflowAssistantButton
								clicked={isAssistantOpen}
								onClick={() =>
									setIsAssistantOpen(!isAssistantOpen)
								}
							/>
						</Flex>

						<Flex direction="column" gap="3">
							<Text size="3" weight="medium">
								Workflow Actions
							</Text>

							<Flex direction="column" gap="2">
								<div
									onDragStart={(event) =>
										onDragStart(
											event,
											ActionNode.MANUAL_START,
										)
									}
								>
									<EditorCard
										icon={<StartWorkflowActionIcon />}
										label={getActionNodeLabel(
											ActionNode.MANUAL_START,
										)}
									/>
								</div>

								<div
									onDragStart={(event) =>
										onDragStart(
											event,
											ActionNode.INTEGRATION,
										)
									}
								>
									<EditorCard
										icon={<IntegrationIcon />}
										label={getActionNodeLabel(
											ActionNode.INTEGRATION,
										)}
									/>
								</div>

								<EditorCard
									icon={<TransformActionIcon />}
									label={getActionNodeLabel(
										ActionNode.TRANSFORM,
									)}
									isComingSoon
								/>

								<div
									onDragStart={(event) =>
										onDragStart(
											event,
											ActionNode.IF_CONDITION,
										)
									}
								>
									<EditorCard
										icon={<IfConditionActionIcon />}
										label={getActionNodeLabel(
											ActionNode.IF_CONDITION,
										)}
									/>
								</div>

								<div
									onDragStart={(event) =>
										onDragStart(event, ActionNode.AI_ACTION)
									}
								>
									<EditorCard
										icon={<AiActionsIcon />}
										label={getActionNodeLabel(
											ActionNode.AI_ACTION,
										)}
									/>
								</div>

								<div
									onDragStart={(event) =>
										onDragStart(
											event,
											ActionNode.SEND_EMAIL,
										)
									}
								>
									<EditorCard
										icon={<SendEmailActionIcon />}
										label={getActionNodeLabel(
											ActionNode.SEND_EMAIL,
										)}
									/>
								</div>

								<EditorCard
									icon={<ReceiveEmailActionIcon />}
									label={getActionNodeLabel(
										ActionNode.RECEIVE_EMAIL,
									)}
									isComingSoon
								/>

								<div
									onDragStart={(event) =>
										onDragStart(event, ActionNode.NOTE)
									}
								>
									<EditorCard
										icon={<NoteActionIcon />}
										label={getActionNodeLabel(
											ActionNode.NOTE,
										)}
									/>
								</div>
							</Flex>
						</Flex>

						<Flex direction="column" gap="4">
							<Text size="3" weight="medium">
								Case Actions
							</Text>

							<Flex direction="column" gap="2">
								<EditorCard
									icon={<CreateCaseIcon />}
									label="Create Case"
									isComingSoon
								/>

								<EditorCard
									icon={<UpdateCaseIcon />}
									label="Update Case"
									isComingSoon
								/>

								<EditorCard
									icon={<QueryCasesIcon />}
									label="Query Cases"
									isComingSoon
								/>

								<EditorCard
									icon={<CaseTriggerIcon />}
									label="Case Trigger"
									isComingSoon
								/>
							</Flex>
						</Flex>
					</Flex>

					<Box pt="4" width="95%">
						<WorkflowTemplates />
					</Box>
				</Flex>
			</Card>

			{isAssistantOpen && <WorkflowAssistant />}
		</>
	);
}
