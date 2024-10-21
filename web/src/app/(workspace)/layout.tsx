"use server";

import Nav from "@/components/navbar/navbar";
import { Box, Grid } from "@radix-ui/themes";
import { ReactNode } from "react";
import ReactQueryProvider from "@/providers/react-query";
import ClientSessionValidator from "@/providers/client-session-validator";
import { isAuthDisabled } from "@/lib/env";

export default async function Layout({ children }: { children: ReactNode }) {
	const disableAuth = await isAuthDisabled();
	return (
		<ClientSessionValidator isAuthDisabled={disableAuth}>
			<ReactQueryProvider>
				<Grid columns="56px 1fr" width="auto" height="100vh">
					<Box>
						<Nav />
					</Box>
					<Box>{children}</Box>
				</Grid>
			</ReactQueryProvider>
		</ClientSessionValidator>
	);
}
