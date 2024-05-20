import React from "react";
import { DocsThemeConfig } from "nextra-theme-docs";
import Logo from "./components/logo";
import { useRouter } from "next/router";

const config: DocsThemeConfig = {
	logo: <Logo />,
	project: {
		link: "https://github.com/admyral-Security/admyral",
	},
	chat: {
		link: "https://discord.gg/GqbJZT9Hbf",
	},
	docsRepositoryBase: "https://github.com/admyral-Security/admyral",
	footer: {
		text: "Admyral Technologies GmbH",
	},
	useNextSeoProps() {
		return {
			titleTemplate: "%s - Admyral Docs",
			description: "Next-gen Security Automation",
			additionalLinkTags: [
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
	},
};

export default config;
