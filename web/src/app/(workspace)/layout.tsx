import Nav from "@/components/nav";
import { Box, Grid } from "@radix-ui/themes";
import { ReactNode } from "react";
import PostHogIdentifierProvider from "../providers";
import { Bounce, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./layout.css";

export default function Layout({ children }: { children: ReactNode }) {
	return (
		<PostHogIdentifierProvider>
			<Grid columns="56px 1fr" width="auto" height="100vh">
				<Box>
					<Nav />
				</Box>
				<Box>{children}</Box>
			</Grid>
			<ToastContainer
				position="bottom-center"
				autoClose={5000}
				hideProgressBar={true}
				stacked={false}
				closeOnClick={true}
				closeButton={false}
				theme="colored"
				transition={Bounce}
				icon={false}
			/>
		</PostHogIdentifierProvider>
	);
}
