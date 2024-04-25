import React from "react";
import { DocsThemeConfig } from "nextra-theme-docs";
import Logo from "./components/logo";

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
};

export default config;
