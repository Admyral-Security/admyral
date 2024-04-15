import CreateNewWorkflowButton from "@/components/create-new-workflow-button";
import WorkflowsList from "@/components/workflows-list";
import { Flex, Grid, Text } from "@radix-ui/themes";
import { listWorkflows } from "@/lib/api";

export default async function WorkflowOverviewPage() {
	const workflows = await listWorkflows();

	return (
		<Grid rows="48px 1fr" width="auto">
			<Flex
				pb="2"
				pt="2"
				pl="4"
				pr="4"
				justify="between"
				align="center"
				className="border-b-2 border-gray-200"
			>
				<Text size="4" weight="medium">
					Workflow Overview
				</Text>
				<CreateNewWorkflowButton size="2" />
			</Flex>

			<Flex
				mt="6"
				direction="column"
				height="100%"
				width="100%"
				justify="center"
				align="center"
			>
				<WorkflowsList workflowsList={workflows} />
			</Flex>
		</Grid>
	);
}
