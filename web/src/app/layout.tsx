import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
	title: "Admyral",
	description: "Next-gen SOAR",
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
			<body className={`${inter.className} h-full`}>{children}</body>
		</html>
	);
}
