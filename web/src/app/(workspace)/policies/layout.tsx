import SideNavInnerPage from "@/components/side-nav-inner-page/side-nav-inner-page";
import { Box, Flex, Grid, Text } from "@radix-ui/themes";

export default function PoliciesLayout({
	children,
}: {
	children: React.ReactNode;
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
						Policy Management
					</Text>
				</Flex>
			</Box>

			<Grid
				columns="165px 1fr"
				width="auto"
				height="calculate(100vh - 56px)"
			>
				<SideNavInnerPage
					basePath="/policies"
					paths={[
						{
							href: "/policies",
							title: "Policies",
							selectionCriteria: ["/policies", "/policy"],
						},
						{
							href: "/policies/controls",
							title: "Controls",
							selectionCriteria: ["/policies/controls"],
						},
						{
							href: "/policies/audit",
							title: "Audit",
							selectionCriteria: ["/policies/audit"],
						},
					]}
				/>

				<Box width="100%" height="calc(100vh - 56px)">
					{children}
				</Box>
			</Grid>
		</Grid>
	);
}
