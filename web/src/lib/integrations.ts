import {
	IntegrationCredentialDefinition,
	IntegrationDefinition,
	IntegrationType,
} from "./types";

export const INTEGRATIONS: Record<string, IntegrationDefinition> = {
	// VirusTotal
	[IntegrationType.VIRUSTOTAL]: {
		name: "VirusTotal",
		integrationType: IntegrationType.VIRUSTOTAL,
		credentials: [
			{
				id: "API_KEY",
				displayName: "API Key",
			},
		],
		apis: [
			{
				id: "GET_A_FILE_REPORT",
				name: "Get a file report",
				description: "Retrieve information about a file using its hash",
				documentationUrl:
					"https://docs.virustotal.com/reference/file-info",
				parameters: [
					{
						id: "hash",
						displayName: "Hash",
						description: "The file's hash",
						required: true,
					},
				],
				requiresAuthentication: true,
			},
			// {
			// 	id: "SCAN_URL",
			// 	name: "Scan URL",
			// 	description: "TODO: ...",
			// 	documentationUrl:
			// 		"https://docs.virustotal.com/reference/scan-url",
			// 	parameters: [
			// 		{
			// 			id: "url",
			// 			displayName: "URL",
			// 			description: "The URL to scan",
			// 			required: true,
			// 		},
			// 	],
			// },
			// {
			// 	id: "GET_A_URL_ANALYSIS_REPORT",
			// 	name: "Get a URL analysis report",
			// 	description: "TODO: ...",
			// 	documentationUrl:
			// 		"https://docs.virustotal.com/reference/url-info",
			// 	parameters: [
			// 		{
			// 			id: "id",
			// 			displayName: "ID",
			// 			description: "The URL's id or base64 encoded URL",
			// 			required: true,
			// 		},
			// 	],
			// },
			{
				id: "GET_A_DOMAIN_REPORT",
				name: "Get a domain report",
				description:
					"Retrieve information about a domain (reputation, whois information, last DNS records, etc.)",
				documentationUrl:
					"https://docs.virustotal.com/reference/domain-info",
				parameters: [
					{
						id: "domain",
						displayName: "Domain",
						description: "The domain to get a report for",
						required: true,
					},
				],
				requiresAuthentication: true,
			},
			{
				id: "GET_IP_ADDRESS_REPORT",
				name: "Get IP address report",
				description:
					"Retrieve information about an IP address (reputation, country, last SSL certificate, etc.)",
				documentationUrl:
					"https://docs.virustotal.com/reference/ip-info",
				parameters: [
					{
						id: "ip",
						displayName: "IP Address",
						description: "The IP address to get a report for",
						required: true,
					},
				],
				requiresAuthentication: true,
			},
		],
	},
	// AlienVault OTX
	[IntegrationType.ALIENVAULT_OTX]: {
		name: "AlienVault OTX",
		integrationType: IntegrationType.ALIENVAULT_OTX,
		credentials: [
			{
				id: "API_KEY",
				displayName: "API Key",
			},
		],
		apis: [
			{
				id: "GET_DOMAIN_INFORMATION",
				name: "Get Domain Information",
				description:
					"Information about the currently available data (geographic, malware, URLs, passive DNS records, whois, meta data for http(s) connections).",
				documentationUrl:
					"https://otx.alienvault.com/assets/static/external_api.html#api_v1_indicators_domain__domain___section__get",
				parameters: [
					{
						id: "domain",
						displayName: "Domain",
						description: "The domain to get a report for",
						required: true,
					},
				],
				requiresAuthentication: true,
			},
		],
	},
	// ...
};
