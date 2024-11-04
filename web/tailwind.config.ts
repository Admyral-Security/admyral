import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";

const config: Config = {
	content: [
		"./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
		"./src/components/**/*.{js,ts,jsx,tsx,mdx}",
		"./src/app/**/*.{js,ts,jsx,tsx,mdx}",
		// Path to Tremor module
		"./node_modules/@tremor/**/*.{js,ts,jsx,tsx}",
		"./src/utils/chartUtils.ts",
	],
	theme: {
		extend: {
			keyframes: {
				slideDown: {
					from: { height: "0px" },
					to: { height: "var(--radix-accordion-content-height)" },
				},
				slideUp: {
					from: { height: "var(--radix-accordion-content-height)" },
					to: { height: "0px" },
				},
			},
			animation: {
				slideDown: "slideDown 300ms cubic-bezier(0.87, 0, 0.13, 1)",
				slideUp: "slideUp 300ms cubic-bezier(0.87, 0, 0.13, 1)",
			},
			colors: {
				tremor: {
					brand: {
						faint: "#eff6ff",
						muted: "#bfdbfe",
						subtle: "#60a5fa",
						DEFAULT: "#3b82f6",
						emphasis: "#1d4ed8",
						inverted: "#ffffff",
					},
					background: {
						muted: "#f9fafb",
						subtle: "#f3f4f6",
						DEFAULT: "#ffffff",
						emphasis: "#374151",
					},
					content: {
						subtle: "#9CA3AF",
						DEFAULT: "#6B7280",
						emphasis: "#374151",
					},
				},
			},
			borderRadius: {
				"tremor-small": "0.375rem",
				"tremor-default": "0.5rem",
				"tremor-full": "9999px",
			},
		},
	},
	plugins: [
		plugin(function ({ addComponents }) {
			addComponents({
				".editor-wrapper .monaco-editor": {
					borderRadius: "10px",
				},
				".editor-wrapper .overflow-guard": {
					borderRadius: "10px",
					border: "1px solid #d9d9d9",
				},
			});
		}),
		require("@headlessui/tailwindcss"),
		require("@tailwindcss/forms"),
	],
};
export default config;
