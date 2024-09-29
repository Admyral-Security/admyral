"use server";

import Nav from "@/components/navbar/navbar";
import { Box, Grid, Text } from "@radix-ui/themes";
import { ReactNode } from "react";
import { Slide, ToastContainer } from "react-toastify";
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
				<ToastContainer
					position="bottom-center"
					autoClose={4000}
					limit={4}
					hideProgressBar={true}
					stacked={false}
					closeOnClick={true}
					closeButton={false}
					theme="colored"
					transition={Slide}
					icon={false}
				/>
			</ReactQueryProvider>
		</ClientSessionValidator>
	);
}
