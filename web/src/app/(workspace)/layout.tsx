import Nav from "@/components/navbar/navbar";
import { Box, Grid } from "@radix-ui/themes";
import { ReactNode } from "react";
import { Slide, ToastContainer } from "react-toastify";
import { DISABLE_AUTH } from "@/constants/env";
import ReactQueryProvider from "@/providers/react-query";
import ClientSessionValidator from "@/providers/client-session-validator";

export default async function Layout({ children }: { children: ReactNode }) {
	return (
		<ClientSessionValidator isAuthDisabled={DISABLE_AUTH}>
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
