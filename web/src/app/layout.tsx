import type { Metadata } from "next";
import "react-toastify/dist/ReactToastify.css";
import "./globals.css";
import "@radix-ui/themes/styles.css";
import { Theme } from "@radix-ui/themes";
import { inter } from "./fonts";
import { CSPostHogProvider } from "@/app/providers";

export const metadata: Metadata = {
	title: "Admyral",
	description: "Next-gen Security Automation",
	icons: [
		{
			rel: "icon",
			url: "/favicon-light.ico",
			href: "/favicon-light.ico",
			media: "(prefers-color-scheme: light)",
		},
		{
			rel: "icon",
			url: "/favicon.ico",
			href: "/favicon.ico",
			media: "(prefers-color-scheme: dark)",
		},
	],
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" className="h-full">
			<CSPostHogProvider>
				<body className={`${inter.className} h-full`}>
					<Theme>{children}</Theme>
				</body>
			</CSPostHogProvider>
		</html>
	);
}
