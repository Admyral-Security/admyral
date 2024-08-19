"use client";

import { Card, Flex, IconButton, Text } from "@radix-ui/themes";
import Link from "next/link";
import RightArrowIcon from "@/components/icons/right-arrow-icon";
import PublishWorkflowToggleWorkflowList from "../publish-workflow-toggle/publish-workflow-toggle-workflow-list";

interface WorkflowListElementProps {
	workflowId: string;
	workflowName: string | null;
	description: string | null;
	isLive: boolean;
}

export default function WorkflowListElement({
	workflowId,
	workflowName,
	description,
	isLive,
}: WorkflowListElementProps) {
	return (
		<Card key={workflowId} size="3" variant="surface">
			<Flex justify="between" align="center">
				<Flex direction="column" gap="2">
					<Text>{workflowName || workflowId}</Text>
					{description !== null && (
						<Text size="2" color="gray">
							{description}
						</Text>
					)}
				</Flex>

				<Flex align="center" gap="5" justify="between" width="178px">
					<PublishWorkflowToggleWorkflowList
						workflowId={workflowId}
						isLive={isLive}
					/>

					<Link href={`/editor/${workflowId}`}>
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
