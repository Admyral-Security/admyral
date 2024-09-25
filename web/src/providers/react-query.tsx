"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";

// const queryClient = new QueryClient({
// 	defaultOptions: {
// 	  queries: {
// 		gcTime: 1000 * 60 * 60 * 24, // 24 hours
// 	  },
// 	},
//   })
const queryClient = new QueryClient();

export default function ReactQueryProvider({
	children,
}: {
	children: ReactNode;
}) {
	return (
		<QueryClientProvider client={queryClient}>
			{children}
		</QueryClientProvider>
	);
}
