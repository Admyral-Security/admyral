import Dashboard from "@/components/dashboard/dashboard";
import { Box, Flex, Grid, Text } from "@radix-ui/themes";

export default function DashboardPage() {
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
						Dashboard
					</Text>
				</Flex>
			</Box>

			<Flex direction="column" height="100%" width="100%">
				<Dashboard />
			</Flex>
		</Grid>
	);
}
