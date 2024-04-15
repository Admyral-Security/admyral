"use client";

import { InfoCircledIcon } from "@radix-ui/react-icons";
import { Box, Callout, Card, Flex, IconButton, Text } from "@radix-ui/themes";
import CreateNewWorkflowButton from "./create-new-workflow-button";
import RightArrowIcon from "./icons/right-arrow-icon";
import PublishWorkflowToggle from "./publish-workflow-toggle";
import Link from "next/link";
import { useState } from "react";
import { updateWorkflow } from "@/lib/api";

function NoWorkflowExists() {
	return (
		<Card size="3">
			<Callout.Root variant="surface" size="3" highContrast>
				<Callout.Icon>
					<InfoCircledIcon />
				</Callout.Icon>
				<Callout.Text size="3">
					No workflow has been created yet.
				</Callout.Text>
			</Callout.Root>

			<Box pt="4">
				<CreateNewWorkflowButton size="4" />
			</Box>
		</Card>
	);
}

interface WorkflowListElementProps {
	workflowId: string;
	workflowName: string;
	isLive: boolean;
	onIsLiveChange: (newIsLive: boolean) => void;
}

function WorkflowListElement({
	workflowId,
	workflowName,
	isLive,
	onIsLiveChange,
}: WorkflowListElementProps) {
	return (
		<Card key={workflowId} size="3" variant="surface">
			<Flex justify="between" align="center">
				<Text>{workflowName}</Text>

				<Flex align="center" gap="5" justify="between" width="178px">
					<PublishWorkflowToggle
						isLive={isLive}
						onIsLiveChange={onIsLiveChange}
					/>

					<Link href={`/workflows/${workflowId}`}>
						<IconButton
							size="4"
							variant="soft"
							color="gray"
							style={{ cursor: "pointer" }}
						>
							<RightArrowIcon />
						</IconButton>
					</Link>
				</Flex>
			</Flex>
		</Card>
	);
}

export interface WorkflowListEntry {
	workflowId: string;
	workflowName: string;
	isLive: boolean;
}

export interface WorkflowsListProps {
	workflowsList: WorkflowListEntry[];
}

export default function WorkflowsList({ workflowsList }: WorkflowsListProps) {
	const [workflows, setWorkflows] =
		useState<WorkflowListEntry[]>(workflowsList);
	const [error, setError] = useState<string | null>();

	const onsIsLiveChange = (
		workflowId: string,
		newIsLive: boolean,
		workflowsIdx: number,
	) => {
		setError(null);

		const workflowsCopy = [...workflows];
		workflowsCopy[workflowsIdx].isLive = newIsLive;

		updateWorkflow(workflowId, null, null, newIsLive)
			.then(() => setWorkflows(workflowsCopy))
			.catch((_) => {
				if (newIsLive) {
					setError("Failed to set workflow as active");
				} else {
					setError("Failed to set workflow as inactive");
				}
			});
	};

	return (
		<Flex direction="column" width="100%" align="center" gap="5">
			<Box width="50%">
				<Text size="4" weight="medium">
					Workflows
				</Text>
			</Box>

			{error && (
				<Callout.Root color="red">
					<Callout.Icon>
						<InfoCircledIcon />
					</Callout.Icon>
					<Callout.Text>{error}</Callout.Text>
				</Callout.Root>
			)}

			<Box width="50%">
				{workflows.length === 0 ? (
					<NoWorkflowExists />
				) : (
					<Flex direction="column" gap="17px">
						{workflows.map((workflow, idx) => (
							<WorkflowListElement
								workflowId={workflow.workflowId}
								workflowName={workflow.workflowName}
								isLive={workflow.isLive}
								onIsLiveChange={(newIsLive) =>
									onsIsLiveChange(
										workflow.workflowId,
										newIsLive,
										idx,
									)
								}
							/>
						))}
					</Flex>
				)}
			</Box>
		</Flex>
	);
}
