import type { Metadata } from "next";
import "./globals.css";
import "@radix-ui/themes/styles.css";
import { Theme } from "@radix-ui/themes";
import { inter } from "./fonts";
import { SessionProvider } from "@/providers/session";
import { ToastProvider } from "@/providers/toast";

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

export default async function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" className="h-full">
			<body className={`${inter.className} h-full`}>
				<SessionProvider>
					<Theme>
						<ToastProvider>{children}</ToastProvider>
					</Theme>
				</SessionProvider>
			</body>
		</html>
	);
}
