import SideNavInnerPage from "@/components/side-nav-inner-page/side-nav-inner-page";
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
				<SideNavInnerPage
					basePath="/settings"
					paths={[
						{
							href: "/settings",
							title: "Account",
							selectionCriteria: ["/settings"],
						},
						{
							href: "/settings/secrets",
							title: "Secrets",
							selectionCriteria: ["/settings/secrets"],
						},
						{
							href: "/settings/api-keys",
							title: "API Keys",
							selectionCriteria: ["/settings/api-keys"],
						},
					]}
				/>
				<Box>{children}</Box>
			</Grid>
		</Grid>
	);
}
