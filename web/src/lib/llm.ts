import { IntegrationType } from "./integrations";

export type LLMDefinition = {
	name: string;
	icon: string;
	models?: {
		id: string;
		displayName: string;
	}[];
	credentials?: {
		id: string;
		displayName: string;
	}[];
};

export const LLMS: Record<string, LLMDefinition> = {
	ADMYRAL: {
		name: "Provided by Admyral",
		icon: "/logo.svg",
		models: [
			{
				id: "gpt-4o",
				displayName: "GPT-4o",
			},
			{
				id: "gpt-4-turbo",
				displayName: "GPT-4 Turbo",
			},
			{
				id: "gpt-3.5-turbo",
				displayName: "GPT-3.5 Turbo",
			},
		],
	},
	[IntegrationType.OPENAI]: {
		name: "OpenAI",
		credentials: [
			{
				id: "API_KEY",
				displayName: "API Key",
			},
		],
		icon: "/openai_logo.svg",
		models: [
			{
				id: "gpt-4o",
				displayName: "GPT-4o",
			},
			{
				id: "gpt-4-turbo",
				displayName: "GPT-4 Turbo",
			},
			{
				id: "gpt-3.5-turbo",
				displayName: "GPT-3.5 Turbo",
			},
		],
	},
	[IntegrationType.ANTHROPIC]: {
		name: "Anthropic",
		credentials: [
			{
				id: "API_KEY",
				displayName: "API Key",
			},
		],
		icon: "/anthropic_logo.svg",
		models: [
			{
				id: "claude-3-opus-20240229",
				displayName: "Claude 3 Opus",
			},
			{
				id: "claude-3-sonnet-20240229",
				displayName: "Claude 3 Sonnet",
			},
			{
				id: "claude-3-haiku-20240307",
				displayName: "Claude 3 Haiku",
			},
			{
				id: "claude-2.1",
				displayName: "Claude 2.1",
			},
			{
				id: "claude-2.0",
				displayName: "Claude 2.0",
			},
			{
				id: "claude-instant-1.2",
				displayName: "Claude Instant 1.2",
			},
		],
	},
	[IntegrationType.MISTRAL]: {
		name: "Mistral AI",
		credentials: [
			{
				id: "API_KEY",
				displayName: "API Key",
			},
		],
		icon: "/mistralai_logo.png",
		models: [
			{
				id: "open-mistral-7b",
				displayName: "Open Mistral 7B",
			},
			{
				id: "open-mixtral-8x7b",
				displayName: "Open Mixtral 8x7B",
			},
			{
				id: "open-mixtral-8x22b",
				displayName: "Open Mixtral 8x22B",
			},
			{
				id: "mistral-small-latest",
				displayName: "Mistral Small",
			},
			{
				id: "mistral-large-latest",
				displayName: "Mistral Large",
			},
		],
	},
	[IntegrationType.AZURE_OPENAI]: {
		name: "Azure OpenAI",
		credentials: [
			{
				id: "API_KEY",
				displayName: "API Key",
			},
			{
				id: "ENDPOINT",
				displayName: "Azure OpenAI Endpoint",
			},
		],
		icon: "/azure_logo.svg",
	},
};
