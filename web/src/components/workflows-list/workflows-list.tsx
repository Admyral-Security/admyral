"use client";

import { InfoCircledIcon } from "@radix-ui/react-icons";
import { Box, Callout, Flex, Spinner, Text } from "@radix-ui/themes";
import NoWorkflowExists from "./no-workflow-exists";
import WorkflowListElement from "./workflow-list-element";
import { useListWorkflowsApi } from "@/hooks/use-list-workflows-api";
import { useWorkflowsListStore } from "@/stores/workflows-list-store";
import { useEffect } from "react";

export interface WorkflowListEntry {
	workflowId: string;
	workflowName: string;
	isLive: boolean;
}

export default function WorkflowsList() {
	const { data, isPending, error } = useListWorkflowsApi();
	const { workflows, setWorkflows } = useWorkflowsListStore();

	useEffect(() => {
		if (data) {
			setWorkflows(data);
		}
	}, [data, setWorkflows]);

	if (isPending) {
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
					<Callout.Text>{error.message}</Callout.Text>
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
								description={workflow.workflowDescription}
								controls={workflow.controls}
								isLive={workflow.isActive}
							/>
						))}
					</Flex>
				)}
			</Box>
		</Flex>
	);
}
