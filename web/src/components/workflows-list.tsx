"use client";

import { InfoCircledIcon } from "@radix-ui/react-icons";
import {
	Box,
	Callout,
	Card,
	Dialog,
	Flex,
	IconButton,
	Spinner,
	Text,
} from "@radix-ui/themes";
import RightArrowIcon from "./icons/right-arrow-icon";
import PublishWorkflowToggle from "./publish-workflow-toggle";
import Link from "next/link";
import { useEffect, useState } from "react";
import { listWorkflows } from "@/lib/api";
import { useSearchParams } from "next/navigation";
import useWelcomeDialog from "@/providers/welcome-dialog-provider";
import useGettingStartedDialog from "@/providers/getting-started-provider";

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
		</Card>
	);
}

interface WorkflowListElementProps {
	workflowId: string;
	workflowName: string;
	isLive: boolean;
	publishWorkflowToggleBeforeUpdate: () => void;
	publishWorkflowToggleOnSuccess: () => void;
	publishWorkflowToggleOnError: () => void;
}

function WorkflowListElement({
	workflowId,
	workflowName,
	isLive,
	publishWorkflowToggleBeforeUpdate,
	publishWorkflowToggleOnSuccess,
	publishWorkflowToggleOnError,
}: WorkflowListElementProps) {
	return (
		<Card key={workflowId} size="3" variant="surface">
			<Flex justify="between" align="center">
				<Text>{workflowName}</Text>

				<Flex align="center" gap="5" justify="between" width="178px">
					<PublishWorkflowToggle
						workflowId={workflowId}
						isLive={isLive}
						beforeUpdate={publishWorkflowToggleBeforeUpdate}
						onSuccess={publishWorkflowToggleOnSuccess}
						onError={publishWorkflowToggleOnError}
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

export default function WorkflowsList() {
	const [loading, setLoading] = useState(true);
	const [workflows, setWorkflows] = useState<WorkflowListEntry[]>([]);
	const [error, setError] = useState<string | null>();

	const searchParams = useSearchParams();
	const isFirstLogin = searchParams.get("isFirstLogin") === "true";

	const { openWelcomeDialog } = useWelcomeDialog();
	const { openGettingStartedDialog } = useGettingStartedDialog();

	useEffect(() => {
		setError(null);
		listWorkflows()
			.then((workflows) => {
				setWorkflows(workflows);

				if (isFirstLogin) {
					if (
						process.env.NEXT_PUBLIC_ENABLE_WELCOME_DIALOG === "true"
					) {
						openWelcomeDialog();
					} else {
						openGettingStartedDialog();
					}
				}
			})
			.catch((err) =>
				setError(
					`Failed to load workflow list. Please refresh the page. If the issue persists, please contact us on Discord or via email ${process.env.NEXT_PUBLIC_SUPPORT_EMAIL}.`,
				),
			)
			.finally(() => setLoading(false));
	}, []);

	if (loading) {
		return (
			<Flex
				direction="column"
				width="100%"
				align="center"
				justify="center"
				gap="5"
			>
				<Box width="50%">
					<Text size="4" weight="medium">
						Workflows
					</Text>
				</Box>

				<Spinner size="3" />
			</Flex>
		);
	}

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
								key={`workflows_list_${idx}`}
								workflowId={workflow.workflowId}
								workflowName={workflow.workflowName}
								isLive={workflow.isLive}
								publishWorkflowToggleBeforeUpdate={() =>
									setError(null)
								}
								publishWorkflowToggleOnSuccess={() => {
									const workflowsCopy = [...workflows];
									workflowsCopy[idx].isLive =
										!workflow.isLive;
									setWorkflows(workflowsCopy);
								}}
								publishWorkflowToggleOnError={() => {
									if (workflow.isLive) {
										setError(
											"Failed to set workflow as inactive",
										);
									} else {
										setError(
											"Failed to set workflow as active",
										);
									}
								}}
							/>
						))}
					</Flex>
				)}
			</Box>
		</Flex>
	);
}
