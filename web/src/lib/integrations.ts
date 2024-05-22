import { IntegrationDefinition, IntegrationType } from "./types";

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
	// Threatpost
	[IntegrationType.THREATPOST]: {
		name: "Threatpost",
		integrationType: IntegrationType.THREATPOST,
		credentials: [],
		apis: [
			{
				id: "FETCH_RSS_FEED",
				name: "Get Latest Threats",
				description:
					"Get the latest threats from Threatpost's RSS feed",
				documentationUrl: "https://threatpost.com/",
				parameters: [],
				requiresAuthentication: false,
			},
		],
	},
	// YARAify
	[IntegrationType.YARAIFY]: {
		name: "YARAify",
		integrationType: IntegrationType.YARAIFY,
		credentials: [],
		apis: [
			{
				id: "QUERY_A_FILE_HASH",
				name: "Query a File Hash",
				description:
					"Query YARAify for a file hash (SHA256, MD5, SHA1, SHA3-384)",
				documentationUrl:
					"https://yaraify.abuse.ch/api/#query-filehash",
				parameters: [
					{
						id: "hash",
						displayName: "Hash",
						description: "The file's hash",
						required: true,
					},
				],
				requiresAuthentication: false,
			},
			{
				id: "QUERY_YARA_RULE",
				name: "Query YARA Rule",
				description:
					"Get a list of recent files matching a specific YARA rule",
				documentationUrl: "https://yaraify.abuse.ch/api/#yara",
				parameters: [
					{
						id: "yara",
						displayName: "YARA",
						description: "YARA rule to query for",
						required: true,
					},
				],
				requiresAuthentication: false,
			},
			{
				id: "QUERY_CLAMAV_SIGNATURE",
				name: "Query ClamAV Signature",
				description:
					"Get a list of recent files associated with a specific ClamAV signature",
				documentationUrl: "https://yaraify.abuse.ch/api/#clamav",
				parameters: [
					{
						id: "clamav",
						displayName: "ClamAV Signature",
						description: "ClamAV Signature to query for",
						required: true,
					},
				],
				requiresAuthentication: false,
			},
			{
				id: "QUERY_IMPHASH",
				name: "Query imphash",
				description:
					"Get a list of recent files associated with a specific imphash",
				documentationUrl: "https://yaraify.abuse.ch/api/#imphash",
				parameters: [
					{
						id: "imphash",
						displayName: "imphash",
						description: "imphash to query for",
						required: true,
					},
				],
				requiresAuthentication: false,
			},
			{
				id: "QUERY_TLSH",
				name: "Query tlsh",
				description:
					"Get a list of recent files associated with a tlsh",
				documentationUrl: "https://yaraify.abuse.ch/api/#tlsh",
				parameters: [
					{
						id: "tlsh",
						displayName: "tlsh",
						description: "tlsh to query for",
						required: true,
					},
				],
				requiresAuthentication: false,
			},
			{
				id: "QUERY_TELFHASH",
				name: "Query telfhash",
				description:
					"Get a list of recent files associated with a specific telfhash",
				documentationUrl: "https://yaraify.abuse.ch/api/#telfhash",
				parameters: [
					{
						id: "telfhash",
						displayName: "telfhash",
						description: "telfhash to query for",
						required: true,
					},
				],
				requiresAuthentication: false,
			},
			{
				id: "QUERY_GIMPHASH",
				name: "Query gimphash",
				description:
					"Get a list of recent files associated with a specific gimphash",
				documentationUrl: "https://yaraify.abuse.ch/api/#gimphash",
				parameters: [
					{
						id: "gimphash",
						displayName: "gimphash",
						description: "gimphash to query for",
						required: true,
					},
				],
				requiresAuthentication: false,
			},
			{
				id: "QUERY_ICON_DHASH",
				name: "Query icon dhash",
				description:
					"Get a list of recent files associated with a specific icon dhash",
				documentationUrl: "https://yaraify.abuse.ch/api/#dhash_icon",
				parameters: [
					{
						id: "icon_dhash",
						displayName: "icon dhash",
						description: "icon dhash to query for",
						required: true,
					},
				],
				requiresAuthentication: false,
			},
			{
				id: "LIST_RECENTLY_DEPLOYED_YARA_RULES",
				name: "List Recently Deployed YARA Rules",
				description:
					"Get a list of the most recent deployed YARA rules on YARAify",
				documentationUrl: "https://yaraify.abuse.ch/api/#yara-recent",
				parameters: [],
				requiresAuthentication: false,
			},
		],
	},
	// ...
};
