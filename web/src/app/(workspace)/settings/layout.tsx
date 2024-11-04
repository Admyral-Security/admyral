import SideNavSettings from "@/components/side-nav-settings/side-nav-settings";
import { Box, Flex, Grid, Text } from "@radix-ui/themes";
import { ReactNode } from "react";

export default function SettingsPageLayout({
	children,
}: {
	children: ReactNode;
}) {
	return (
		<Grid rows="56px 1fr" width="auto" height="100%">
			<Box width="100%" height="100%">
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
						zIndex: 100,
						backgroundColor: "white",
					}}
				>
					<Text size="4" weight="medium">
						Settings
					</Text>
				</Flex>
			</Box>

			<Grid
				columns="165px 1fr"
				width="auto"
				height="calculate(100vh - 56px)"
			>
				<SideNavSettings />
				<Box>{children}</Box>
			</Grid>
		</Grid>
	);
}
