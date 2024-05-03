import Nav from "@/components/nav";
import { Box, Grid } from "@radix-ui/themes";
import { ReactNode } from "react";
import PostHogIdentifierProvider from "../providers";

export default function Layout({ children }: { children: ReactNode }) {
	return (
		<PostHogIdentifierProvider>
			<Grid columns="56px 1fr" width="auto" height="100vh">
				<Box>
					<Nav />
				</Box>
				<Box>{children}</Box>
			</Grid>
		</PostHogIdentifierProvider>
	);
}
