"use client";

import Nav from "@/components/navbar/navbar";
import { Box, Grid } from "@radix-ui/themes";
import { ReactNode } from "react";
import { Slide, ToastContainer } from "react-toastify";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// const queryClient = new QueryClient({
// 	defaultOptions: {
// 	  queries: {
// 		gcTime: 1000 * 60 * 60 * 24, // 24 hours
// 	  },
// 	},
//   })
const queryClient = new QueryClient();

export default function Layout({ children }: { children: ReactNode }) {
	return (
		<QueryClientProvider client={queryClient}>
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
		</QueryClientProvider>
	);
}
