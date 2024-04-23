import CreateNewWorkflowButton from "@/components/create-new-workflow-button";
import WorkflowsList from "@/components/workflows-list";
import { Box, Flex, Grid, Text } from "@radix-ui/themes";

export default async function WorkflowOverviewPage() {
	return (
		<Grid rows="56px 1fr" width="auto">
			<Box width="100%">
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
						backgroundColor: "white",
						zIndex: 100,
					}}
				>
					<Text size="4" weight="medium">
						Workflow Overview
					</Text>
					<CreateNewWorkflowButton size="2" />
				</Flex>
			</Box>

			<Flex
				mt="6"
				direction="column"
				height="100%"
				width="100%"
				justify="center"
				align="center"
			>
				<WorkflowsList />
			</Flex>
		</Grid>
	);
}
