export enum IntegrationType {
	VIRUSTOTAL = "VIRUS_TOTAL",
	ALIENVAULT_OTX = "ALIENVAULT_OTX",
	YARAIFY = "YARAIFY",
	THREATPOST = "THREATPOST",
	PHISH_REPORT = "PHISH_REPORT",
	SLACK = "SLACK",
	JIRA = "JIRA",
	MS_TEAMS = "MS_TEAMS",
	MS_DEFENDER_FOR_CLOUD = "MS_DEFENDER_FOR_CLOUD",
}

export enum ApiParameterDatatype {
	TEXT = "TEXT",
	BOOLEAN = "BOOLEAN",
	TEXTAREA = "TEXTAREA",
	NUMBER = "NUMBER",
}

export type IntegrationApiParameter = {
	id: string;
	displayName: string;
	description: string;
	required: boolean;
	dataType: ApiParameterDatatype;
};

export type IntegrationApiDefinition = {
	id: string;
	name: string;
	description: string;
	documentationUrl?: string;
	parameters: IntegrationApiParameter[];
	requiresAuthentication: boolean;
};

export enum AuthType {
	NONE = "NONE",
	// Secret-based credentials (e.g. username/password, API key, client ID and secret, etc.) are represented as a form
	SECRET = "SECRET",
	MS_TEAMS_OAUTH = "MS_TEAMS_OAUTH",
}

export type IntegrationCredentialFormParameter = {
	id: string;
	displayName: string;
};

export interface NoAuthentication {
	authType: AuthType.NONE;
}

export interface SecretAuthentication {
	authType: AuthType.SECRET;
	parameters: IntegrationCredentialFormParameter[];
}

export interface MSTeamsOAuth {
	authType: AuthType.MS_TEAMS_OAUTH;
	// Note: changing the scopes requires users to delete the MS Teams integration and re-add it
	scope: string;
}

export type CredentialDefinition =
	| NoAuthentication
	| SecretAuthentication
	| MSTeamsOAuth;

export type Icon = {
	src: string;
	isSquareIcon: boolean;
};

export type IntegrationDefinition = {
	name: string;
	icon?: Icon;
	apis: IntegrationApiDefinition[];
	credential: CredentialDefinition;
};

export const INTEGRATIONS: Record<string, IntegrationDefinition> = {
	// VirusTotal
	[IntegrationType.VIRUSTOTAL]: {
		name: "VirusTotal",
		icon: {
			src: "/virustotal-icon.svg",
			isSquareIcon: true,
		},
		credential: {
			authType: AuthType.SECRET,
			parameters: [
				{
					id: "API_KEY",
					displayName: "API Key",
				},
			],
		},
		apis: [
			{
				id: "GET_A_FILE_REPORT",
				name: "Get a file report",
				description: "Retrieve information about a file using its hash",
				documentationUrl:
					"https://docs.virustotal.com/reference/file-info",
				parameters: [
					{
						id: "HASH",
						displayName: "Hash",
						description: "The file's hash.",
						required: true,
						dataType: ApiParameterDatatype.TEXT,
					},
				],
				requiresAuthentication: true,
			},
			{
				id: "GET_A_DOMAIN_REPORT",
				name: "Get a domain report",
				description:
					"Retrieve information about a domain (reputation, whois information, last DNS records, etc.)",
				documentationUrl:
					"https://docs.virustotal.com/reference/domain-info",
				parameters: [
					{
						id: "DOMAIN",
						displayName: "Domain",
						description: "The domain to get a report for.",
						required: true,
						dataType: ApiParameterDatatype.TEXT,
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
						id: "IP",
						displayName: "IP Address",
						description: "The IP address to get a report for",
						required: true,
						dataType: ApiParameterDatatype.TEXT,
					},
				],
				requiresAuthentication: true,
			},
			{
				id: "GET_URL_ANALYSIS_REPORT",
				name: "Get URL analysis report",
				description: "Retrieve information about a URL.",
				documentationUrl:
					"https://docs.virustotal.com/reference/url-info",
				parameters: [
					{
						id: "URL",
						displayName: "URL",
						description: "The URL to get a report for",
						required: true,
						dataType: ApiParameterDatatype.TEXT,
					},
				],
				requiresAuthentication: true,
			},
			{
				id: "GET_FILE_BEHAVIOR_REPORTS_SUMMARY",
				name: "Get a summary of all behavior reports for a file",
				description:
					"Retrieve a summary of all behavior reports for a file consisting in merging together the reports produced by multiple sandboxes.",
				documentationUrl:
					"https://docs.virustotal.com/reference/file-all-behaviours-summary",
				parameters: [
					{
						id: "HASH",
						displayName: "Hash",
						description:
							"SHA-256, SHA-1 or MD5 identifying the file",
						required: true,
						dataType: ApiParameterDatatype.TEXT,
					},
				],
				requiresAuthentication: true,
			},
			{
				id: "GET_VOTES_ON_A_DOMAIN",
				name: "Get votes on a domain",
				description: "Retrieve the votes for a domain.",
				documentationUrl:
					"https://docs.virustotal.com/reference/domains-votes-get",
				parameters: [
					{
						id: "DOMAIN",
						displayName: "Domain",
						description: "The domain to get votes for.",
						required: true,
						dataType: ApiParameterDatatype.TEXT,
					},
				],
				requiresAuthentication: true,
			},
			{
				id: "GET_VOTES_ON_A_FILE",
				name: "Get votes on a file",
				description: "Retrieve the votes for a domain.",
				documentationUrl:
					"https://docs.virustotal.com/reference/files-votes-get",
				parameters: [
					{
						id: "HASH",
						displayName: "Hash",
						description:
							"SHA-256, SHA-1 or MD5 identifying the file",
						required: true,
						dataType: ApiParameterDatatype.TEXT,
					},
				],
				requiresAuthentication: true,
			},
			{
				id: "GET_VOTES_ON_AN_IP_ADDRESS",
				name: "Get votes on an IP address",
				description: "Retrieve the votes for an IP address.",
				documentationUrl:
					"https://docs.virustotal.com/reference/ip-votes",
				requiresAuthentication: true,
				parameters: [
					{
						id: "IP",
						displayName: "IP Address",
						description: "The IP address to get votes for.",
						required: true,
						dataType: ApiParameterDatatype.TEXT,
					},
				],
			},
			{
				id: "GET_VOTES_ON_A_URL",
				name: "Get votes on a URL",
				description: "Retrieve the votes for a URL.",
				documentationUrl:
					"https://docs.virustotal.com/reference/urls-votes-get",
				requiresAuthentication: true,
				parameters: [
					{
						id: "URL",
						displayName: "URL",
						description: "The URL to get votes for.",
						required: true,
						dataType: ApiParameterDatatype.TEXT,
					},
				],
			},
			{
				id: "SCAN_URL",
				name: "Scan a URL",
				description: "Submit a URL for scanning.",
				documentationUrl:
					"https://docs.virustotal.com/reference/scan-url",
				requiresAuthentication: true,
				parameters: [
					{
						id: "URL",
						displayName: "URL",
						description: "The URL to scan.",
						required: true,
						dataType: ApiParameterDatatype.TEXT,
					},
				],
			},
			{
				id: "GET_COMMENTS_IP_ADDRESS",
				name: "Get comments on an IP address",
				description: "Retrieve the comments for an IP address.",
				documentationUrl:
					"https://docs.virustotal.com/reference/ip-comments-get",
				requiresAuthentication: true,
				parameters: [
					{
						id: "IP",
						displayName: "IP Address",
						description: "The IP address to get comments for.",
						required: true,
						dataType: ApiParameterDatatype.TEXT,
					},
				],
			},
			{
				id: "GET_COMMENTS_DOMAIN",
				name: "Get comments on a domain",
				description: "Retrieve the comments for a domain.",
				documentationUrl:
					"https://docs.virustotal.com/reference/domains-comments-get",
				requiresAuthentication: true,
				parameters: [
					{
						id: "DOMAIN",
						displayName: "Domain",
						description: "The domain to get comments for.",
						required: true,
						dataType: ApiParameterDatatype.TEXT,
					},
				],
			},
			{
				id: "GET_COMMENTS_FILE",
				name: "Get comments on a file",
				description: "Retrieve the comments for a file.",
				documentationUrl:
					"https://docs.virustotal.com/reference/files-comments-get",
				requiresAuthentication: true,
				parameters: [
					{
						id: "HASH",
						displayName: "Hash",
						description:
							"SHA-256, SHA-1 or MD5 identifying the file",
						required: true,
						dataType: ApiParameterDatatype.TEXT,
					},
				],
			},
			{
				id: "GET_COMMENTS_URL",
				name: "Get comments on a URL",
				description: "Retrieve the comments for a URL.",
				documentationUrl:
					"https://docs.virustotal.com/reference/urls-comments-get",
				requiresAuthentication: true,
				parameters: [
					{
						id: "URL",
						displayName: "URL",
						description: "The URL to get comments for.",
						required: true,
						dataType: ApiParameterDatatype.TEXT,
					},
				],
			},
			{
				id: "SEARCH",
				name: "Search for files, URLs, domains, IPs, and comments",
				description:
					"This endpoint searches for file hashes, URLs, domains, IPs, and comments by tags",
				documentationUrl:
					"https://docs.virustotal.com/reference/api-search",
				requiresAuthentication: true,
				parameters: [
					{
						id: "QUERY",
						displayName: "Query",
						description:
							"File hash, URL, domain, IP, or comment by tag (e.g. #tag)",
						required: true,
						dataType: ApiParameterDatatype.TEXT,
					},
				],
			},
		],
	},
	// AlienVault OTX
	[IntegrationType.ALIENVAULT_OTX]: {
		name: "AlienVault OTX",
		icon: {
			src: "/alienvault_otx_icon.png",
			isSquareIcon: true,
		},
		credential: {
			authType: AuthType.SECRET,
			parameters: [
				{
					id: "API_KEY",
					displayName: "API Key",
				},
			],
		},
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
						id: "DOMAIN",
						displayName: "Domain",
						description: "The domain to get a report for.",
						required: true,
						dataType: ApiParameterDatatype.TEXT,
					},
				],
				requiresAuthentication: true,
			},
		],
	},
	// Threatpost
	[IntegrationType.THREATPOST]: {
		name: "Threatpost",
		icon: {
			src: "/threatpost_logo.svg",
			isSquareIcon: false,
		},
		credential: { authType: AuthType.NONE },
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
		icon: {
			src: "/abusech_yaraify_logo.svg",
			isSquareIcon: false,
		},
		credential: { authType: AuthType.NONE },
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
						id: "HASH",
						displayName: "Hash",
						description: "The file's hash.",
						required: true,
						dataType: ApiParameterDatatype.TEXT,
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
						id: "YARA",
						displayName: "YARA",
						description: "The YARA rule to query for.",
						required: true,
						dataType: ApiParameterDatatype.TEXT,
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
						id: "CLAMAV",
						displayName: "ClamAV Signature",
						description: "The ClamAV Signature to query for.",
						required: true,
						dataType: ApiParameterDatatype.TEXT,
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
						id: "IMPHASH",
						displayName: "imphash",
						description: "The imphash to query for.",
						required: true,
						dataType: ApiParameterDatatype.TEXT,
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
						id: "TLSH",
						displayName: "tlsh",
						description: "The tlsh to query for.",
						required: true,
						dataType: ApiParameterDatatype.TEXT,
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
						id: "TELFHASH",
						displayName: "telfhash",
						description: "The telfhash to query for.",
						required: true,
						dataType: ApiParameterDatatype.TEXT,
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
						id: "GIMPHASH",
						displayName: "gimphash",
						description: "The gimphash to query for.",
						required: true,
						dataType: ApiParameterDatatype.TEXT,
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
						id: "ICON_DHASH",
						displayName: "icon dhash",
						description: "The icon dhash to query for.",
						required: true,
						dataType: ApiParameterDatatype.TEXT,
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
	// Phish Report
	[IntegrationType.PHISH_REPORT]: {
		name: "Phish Report",
		icon: {
			src: "/phish_report.svg",
			isSquareIcon: true,
		},
		credential: {
			authType: AuthType.SECRET,
			parameters: [
				{
					id: "API_KEY",
					displayName: "API Key",
				},
			],
		},
		apis: [
			{
				id: "GET_HOSTING_CONTACT_INFORMATION",
				name: "Get Hosting Providers and Abuse Contact Information for an URL/IP",
				description:
					"Finds the best way to report a URL/IP to the relevant hosting providers and domain registrars.",
				documentationUrl:
					"https://phish.report/api/v0#tag/Analysis/paths/~1api~1v0~1hosting/get",
				parameters: [
					{
						id: "URL",
						displayName: "URL",
						description:
							"The URL, domain, or IP address to find abuse contact information for.",
						required: true,
						dataType: ApiParameterDatatype.TEXT,
					},
				],
				requiresAuthentication: true,
			},
			{
				id: "LIST_TAKEDOWNS",
				name: "List Takedowns",
				description:
					"Retrieve a list of takedowns you've previously reported",
				documentationUrl:
					"https://phish.report/api/v0#tag/Takedown/paths/~1api~1v0~1cases/get",
				parameters: [],
				requiresAuthentication: true,
			},
			{
				id: "START_TAKEDOWN",
				name: "Start a Takedown",
				description:
					"Start the takedown of a URL you've identified as malicious. Phish Report will complete all available automatic takedown steps, and return a list of recommended manual actions.",
				documentationUrl:
					"https://phish.report/api/v0#tag/Takedown/paths/~1api~1v0~1cases/post",
				parameters: [
					{
						id: "URL",
						displayName: "Phishing URL",
						description:
							"The phishing URL to take down. You should have high confidence that this URL is malicious.",
						required: true,
						dataType: ApiParameterDatatype.TEXT,
					},
					{
						id: "IGNORE_DUPLICATES",
						displayName: "Ignore Duplicates",
						description:
							"By default, trying to create a duplicate case will fail. Setting this to true will allow duplictes.",
						required: false,
						dataType: ApiParameterDatatype.BOOLEAN,
					},
				],
				requiresAuthentication: true,
			},
			{
				id: "GET_TAKEDOWN",
				name: "Get a Takedown",
				description:
					"Retrieve the takedown information for an URL you've previously reported.",
				documentationUrl:
					"https://phish.report/api/v0#tag/Takedown/paths/~1api~1v0~1cases~1%7Bid%7D/get",
				requiresAuthentication: true,
				parameters: [
					{
						id: "ID",
						displayName: "Case ID",
						description: "The ID of the takedown request.",
						required: true,
						dataType: ApiParameterDatatype.TEXT,
					},
				],
			},
			{
				id: "CLOSE_TAKEDOWN_CASE",
				name: "Close a Takedown Case",
				description:
					"Close a takedown case you've previously reported (e.g. because the site is not longer active).",
				documentationUrl:
					"https://phish.report/api/v0#tag/Takedown/paths/~1api~1v0~1cases~1%7Bid%7D~1close/put",
				requiresAuthentication: true,
				parameters: [
					{
						id: "ID",
						displayName: "Case ID",
						description: "The ID of the takedown request.",
						required: true,
						dataType: ApiParameterDatatype.TEXT,
					},
					{
						id: "COMMENT",
						displayName: "Comment",
						description:
							"An optional comment explaining why the case is being closed.",
						required: false,
						dataType: ApiParameterDatatype.TEXT,
					},
				],
			},
		],
	},
	// Slack
	[IntegrationType.SLACK]: {
		name: "Slack",
		icon: {
			src: "/slack_logo_color.svg",
			isSquareIcon: true,
		},
		credential: {
			authType: AuthType.SECRET,
			parameters: [
				{
					id: "API_KEY",
					displayName: "API Key",
				},
			],
		},
		apis: [
			{
				id: "SEND_MESSAGE",
				name: "Send a message",
				description:
					"This method posts a message to a public channel, private channel, or direct message (DM, or IM) conversation. Required scope: chat:write",
				documentationUrl:
					"https://api.slack.com/methods/chat.postMessage",
				requiresAuthentication: true,
				parameters: [
					{
						id: "CHANNEL",
						displayName: "Channel / Group / User",
						description:
							"Channel, private group, or user to send a message to. For channels, you can use the name (e.g. #my-channel) or the ID. For private channels and groups, use the ID. For DMs to users, use the user ID.",
						required: true,
						dataType: ApiParameterDatatype.TEXT,
					},
					{
						id: "TEXT",
						displayName: "Text",
						description:
							"The purpose of this field changes depends on whether the blocks field is used. If blocks is used, this is used as a fallback string to display in notifications. If blocks is not used, this is the main body text of the message. It can be formatted as plain text, or with mrkdwn.",
						required: true,
						dataType: ApiParameterDatatype.TEXTAREA,
					},
					{
						id: "BLOCKS",
						displayName: "Blocks",
						description: "An array of layout blocks.",
						required: false,
						dataType: ApiParameterDatatype.TEXTAREA,
					},
					{
						id: "THREAD_TS",
						displayName: "Thread Timestamp",
						description:
							'To reply to another message, provide the "ts" value of the message to reply to. Avoid using a reply\'s "ts" value. Instead, use the "ts" value of the parent message.',
						required: false,
						dataType: ApiParameterDatatype.TEXT,
					},
				],
			},
			{
				id: "LIST_USERS",
				name: "List Users",
				description:
					"Lists all users in a Slack team. This includes deleted/deactivated users. Requred scopes: users:read, users:read.email",
				documentationUrl: "https://api.slack.com/methods/users.list",
				requiresAuthentication: true,
				parameters: [
					{
						id: "INCLUDE_LOCALE",
						displayName: "Include Locale for Users?",
						description:
							"Set this to true to receive the locale for users. Defaults to false.",
						required: false,
						dataType: ApiParameterDatatype.BOOLEAN,
					},
					{
						id: "LIMIT",
						displayName: "Limit",
						description:
							"Number of users to return per page. Maximum of 1000. Defaults to 200.",
						required: false,
						dataType: ApiParameterDatatype.NUMBER,
					},
					{
						id: "RETURN_ALL_PAGES",
						displayName: "Return All Pages",
						description:
							"Set this to true to handle pagination automatically and return all users. Defaults to false.",
						required: false,
						dataType: ApiParameterDatatype.BOOLEAN,
					},
				],
			},
			{
				id: "LOOKUP_BY_EMAIL",
				name: "Lookup User by Email",
				description:
					"Find a user with an email address. Requred scopes: users:read.email",
				documentationUrl:
					"https://api.slack.com/methods/users.lookupByEmail",
				requiresAuthentication: true,
				parameters: [
					{
						id: "EMAIL",
						displayName: "Email",
						description: "An email address to look up.",
						required: true,
						dataType: ApiParameterDatatype.TEXT,
					},
				],
			},
			{
				id: "CONVERSATIONS_OPEN",
				name: "Open a Conversation",
				description:
					"Opens or resumes a direct message or multi-person direct message. Requred scopes: im:write, mpim:write, groups:write, channels:manage",
				documentationUrl:
					"https://api.slack.com/methods/conversations.open",
				requiresAuthentication: true,
				parameters: [
					{
						id: "USERS",
						displayName: "User IDs",
						description:
							'Comma-separated list of 1 to 8 user IDs (e.g. "W1234567890,U2345678901,U3456789012"). If only one user is included, this creates a 1:1 DM. If no users are included, then a channel must be provided.',
						required: false,
						dataType: ApiParameterDatatype.TEXT,
					},
					{
						id: "CHANNEL",
						displayName: "Channel",
						description:
							'Resume a conversation by supplying an "im" or "mpim"\'s ID. Alternatively, provide a list of user IDs.',
						required: false,
						dataType: ApiParameterDatatype.TEXT,
					},
					{
						id: "RETURN_IM",
						displayName: "Return IM?",
						description:
							'Boolean, indicates you want the full IM channel definition in the response. Defaults to "false".',
						required: false,
						dataType: ApiParameterDatatype.BOOLEAN,
					},
				],
			},
			{
				id: "REACTIONS_ADD",
				name: "Add a Reaction",
				description: "Adds a reaction to a message.",
				documentationUrl: "https://api.slack.com/methods/reactions.add",
				requiresAuthentication: true,
				parameters: [
					{
						id: "CHANNEL",
						displayName: "Channel",
						description:
							'Channel where the message to add reaction to was posted (e.g., "C1234567890").',
						required: true,
						dataType: ApiParameterDatatype.TEXT,
					},
					{
						id: "NAME",
						displayName: "Name",
						description:
							'Reaction (emoji) name (e.g., "thumbsup").',
						required: true,
						dataType: ApiParameterDatatype.TEXT,
					},
					{
						id: "TIMESTAMP",
						displayName: "Timestamp",
						description:
							'Timestamp of the message to add reaction to (e.g., "1234567890.123456").',
						required: true,
						dataType: ApiParameterDatatype.TEXT,
					},
				],
			},
		],
	},
	// Jira
	[IntegrationType.JIRA]: {
		name: "Jira",
		icon: {
			src: "/jira_logo.svg",
			isSquareIcon: true,
		},
		credential: {
			authType: AuthType.SECRET,
			parameters: [
				{
					id: "DOMAIN",
					displayName:
						"Domain (e.g., the your-domain part of https://your-domain.atlassian.net)",
				},
				{
					id: "EMAIL",
					displayName:
						"Email of the account who provisioned the API token",
				},
				{
					id: "API_TOKEN",
					displayName: "API Token",
				},
			],
		},
		apis: [
			{
				id: "CREATE_ISSUE",
				name: "Create Issue",
				description: "Create a new issue",
				documentationUrl:
					"https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/#api-rest-api-3-issue-post",
				requiresAuthentication: true,
				parameters: [
					{
						id: "SUMMARY",
						displayName: "Summary",
						description: "Summary of the issue",
						required: true,
						dataType: ApiParameterDatatype.TEXT,
					},
					{
						id: "PROJECT_ID",
						displayName: "Project ID",
						description:
							"The ID of the project to create the issue in",
						required: true,
						dataType: ApiParameterDatatype.TEXT,
					},
					{
						id: "ISSUE_TYPE",
						displayName: "Issue Type",
						description:
							'The name of the issue type to create (e.g. "Story", "Bug")',
						required: true,
						dataType: ApiParameterDatatype.TEXT,
					},
					{
						id: "DESCRIPTION",
						displayName: "Description",
						description:
							"Description of the issue in Atlassian Document Format",
						required: false,
						dataType: ApiParameterDatatype.TEXTAREA,
					},
					{
						id: "ASSIGNEE",
						displayName: "Assignee",
						description: "The account ID of the assignee",
						required: false,
						dataType: ApiParameterDatatype.TEXT,
					},
					{
						id: "LABELS",
						displayName: "Labels",
						description:
							'Comma-separated list of labels (e.g., "label1, label2"). Note that a label must not contain spaces.',
						required: false,
						dataType: ApiParameterDatatype.TEXT,
					},
					{
						id: "PRIORITY",
						displayName: "Priority",
						description:
							'The priority of the issue (e.g., "High", "Medium")',
						required: false,
						dataType: ApiParameterDatatype.TEXT,
					},
					{
						id: "CUSTOM_FIELDS",
						displayName: "Custom Fields",
						description:
							'Custom fields for the issue (e.g., { "customfield_10000": "value" } ) defined as a JSON object.',
						required: false,
						dataType: ApiParameterDatatype.TEXTAREA,
					},
					{
						id: "COMPONENTS",
						displayName: "Components",
						description:
							'JSON array of components for the issue (e.g., [ { "name": "component1" }, { "name": "component2" } ]). Note that you must use the IDs of the custom fields.',
						required: false,
						dataType: ApiParameterDatatype.TEXTAREA,
					},
				],
			},
			{
				id: "ASSIGN_ISSUE",
				name: "Assign Issue",
				description: "Assign an issue to a user.",
				documentationUrl:
					"https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/#api-rest-api-3-issue-issueidorkey-assignee-put",
				requiresAuthentication: true,
				parameters: [
					{
						id: "ISSUE_ID_OR_KEY",
						displayName: "Issue ID or Key",
						description:
							"The ID or key of the issue to be assigned.",
						required: true,
						dataType: ApiParameterDatatype.TEXT,
					},
					{
						id: "ACCOUNT_ID",
						displayName: "Account ID",
						description: "The account ID of the assignee",
						required: true,
						dataType: ApiParameterDatatype.TEXT,
					},
				],
			},
			{
				id: "EDIT_ISSUE",
				name: "Edit Issue",
				description: "Edit an issue",
				documentationUrl:
					"https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/#api-rest-api-3-issue-issueidorkey-put",
				requiresAuthentication: true,
				parameters: [
					{
						id: "ISSUE_ID_OR_KEY",
						displayName: "Issue ID or Key",
						description: "The ID or key of the issue to be edited.",
						required: true,
						dataType: ApiParameterDatatype.TEXT,
					},
					{
						id: "FIELDS",
						displayName: "Fields",
						description:
							"Fields to update in the issue defined as a JSON object (e.g., { 'summary': 'New summary' }).",
						required: false,
						dataType: ApiParameterDatatype.TEXTAREA,
					},
					{
						id: "UPDATE",
						displayName: "Update",
						description:
							'Some fields cannot be updated using "Fields". To update these fields, explicit-verb updates can be made using this field defined as a JSON object (e.g., { "labels": [ { "add": "triaged" } ] }).',
						required: false,
						dataType: ApiParameterDatatype.TEXTAREA,
					},
					{
						id: "NOTIFY_USERS",
						displayName: "Notify Users",
						description:
							"Whether the users watching the issue are notified of the change. Defaults to true.",
						required: false,
						dataType: ApiParameterDatatype.BOOLEAN,
					},
				],
			},
			{
				id: "GET_ISSUE",
				name: "Get Issue",
				description: "Get an issue",
				documentationUrl:
					"https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/#api-rest-api-3-issue-issueidorkey-get",
				requiresAuthentication: true,
				parameters: [
					{
						id: "ISSUE_ID_OR_KEY",
						displayName: "Issue ID or Key",
						description: "The ID or key of the issue to retrieve.",
						required: true,
						dataType: ApiParameterDatatype.TEXT,
					},
					{
						id: "FIELDS",
						displayName: "Fields",
						description:
							'A list of fields to return for the issue. Accepts a comma-separated list. Use it to retrieve a subset of fields. Allowed values: "*all" to return all fields, "*navigable" to return navigable fields, or any issue fields prefixed with a minues to exclude. By default, all fields are returned.',
						required: false,
						dataType: ApiParameterDatatype.TEXT,
					},
					{
						id: "FIELDS_BY_KEYS",
						displayName: "Fields by Keys",
						description:
							"Reference fields by their key (rather than ID).",
						required: false,
						dataType: ApiParameterDatatype.BOOLEAN,
					},
					{
						id: "EXPAND",
						displayName: "Expand",
						description:
							"Use expand to include additional information about the issues in the response. This parameter accepts a comma-separated list. See documentation for allowed values.",
						required: false,
						dataType: ApiParameterDatatype.TEXT,
					},
					{
						id: "PROPERTIES",
						displayName: "Properties",
						description:
							'A list of issue properties to return for the issue. This parameter accepts a comma-separated list. Allowed values: "*all" to return all issue properties or prefix any property with a minus to exclude.',
						required: false,
						dataType: ApiParameterDatatype.TEXT,
					},
				],
			},
			{
				id: "FIND_USERS",
				name: "Find Users",
				description: "Find users",
				documentationUrl:
					"https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-user-search/#api-rest-api-3-user-search-get",
				requiresAuthentication: true,
				parameters: [
					{
						id: "QUERY",
						displayName: "Query",
						description:
							'A query string that is matched against user attributes ("displayName", and "emailAddress") to find relevant users. The string can match the prefix of the attribute\'s value. For example, "query=john" matches a user with a displayName of "John Smith" and a user with an emailAddress of "johnson@example.com". Required, unless Account ID or Property is specified.',
						required: false,
						dataType: ApiParameterDatatype.TEXT,
					},
					{
						id: "ACCOUNT_ID",
						displayName: "Account ID",
						description:
							"A query string that is matched exactly against a user accountId. Required, unless Query or Property is specified.",
						required: false,
						dataType: ApiParameterDatatype.TEXT,
					},
					{
						id: "PROPERTY",
						displayName: "Property",
						description:
							'A query string used to search properties. Property keys are specified by path, so property keys containing dot (.) or equals (=) characters cannot be used. The query string cannot be specified using a JSON object. Example: To search for the value of nested from "{"something":{"nested":1,"other":2}}" use "thepropertykey.something.nested=1". Required, unless Account ID or Query is specified.',
						required: false,
						dataType: ApiParameterDatatype.TEXT,
					},
					{
						id: "USERNAME",
						displayName: "Username",
						description:
							"A query string that is matched exactly against a user name.",
						required: false,
						dataType: ApiParameterDatatype.TEXT,
					},
					{
						id: "START_AT",
						displayName: "Start At",
						description:
							"The index of the first item to return in a page of results (page offset). Default: 0",
						required: false,
						dataType: ApiParameterDatatype.NUMBER,
					},
					{
						id: "MAX_RESULTS",
						displayName: "Max Results",
						description:
							"The maximum number of items to return per page. Default: 50",
						required: false,
						dataType: ApiParameterDatatype.NUMBER,
					},
				],
			},
			{
				id: "GET_ISSUE_COMMENTS",
				name: "Get Issue Comments",
				description: "Get comments for an issue",
				documentationUrl:
					"https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-comments/#api-rest-api-3-issue-issueidorkey-comment-get",
				requiresAuthentication: true,
				parameters: [
					{
						id: "ISSUE_ID_OR_KEY",
						displayName: "Issue ID or Key",
						description:
							"The ID or key of the issue to retrieve comments for.",
						required: true,
						dataType: ApiParameterDatatype.TEXT,
					},
					{
						id: "START_AT",
						displayName: "Start At",
						description:
							"The index of the first item to return in a page of results (page offset). Default: 0",
						required: false,
						dataType: ApiParameterDatatype.NUMBER,
					},
					{
						id: "MAX_RESULTS",
						displayName: "Max Results",
						description:
							"The maximum number of items to return per page. Default: 5000",
						required: false,
						dataType: ApiParameterDatatype.NUMBER,
					},
					{
						id: "ORDER_BY",
						displayName: "Order By",
						description:
							'Order the results by a field. Accepts "created" to sort comments by their created date. Valid values: "created", "-created", "+created".',
						required: false,
						dataType: ApiParameterDatatype.TEXT,
					},
				],
			},
			{
				id: "ADD_COMMENT",
				name: "Add Comment",
				description: "Add a comment to an issue",
				documentationUrl:
					"https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-comments/#api-rest-api-3-issue-issueidorkey-comment-post",
				requiresAuthentication: true,
				parameters: [
					{
						id: "ISSUE_ID_OR_KEY",
						displayName: "Issue ID or Key",
						description:
							"The ID or key of the issue to add a comment to.",
						required: true,
						dataType: ApiParameterDatatype.TEXT,
					},
					{
						id: "BODY",
						displayName: "Body",
						description:
							"The comment text in Atlassian Document Format.",
						required: true,
						dataType: ApiParameterDatatype.TEXTAREA,
					},
				],
			},
			{
				id: "GET_FIELDS",
				name: "Get Fields",
				description: "Get all fields",
				documentationUrl:
					"https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-fields/#api-rest-api-3-field-get",
				requiresAuthentication: true,
				parameters: [],
			},
			{
				id: "UPDATE_CUSTOM_FIELD",
				name: "Update Custom Field",
				description: "Update a custom field",
				documentationUrl:
					"https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-fields/#api-rest-api-3-field-fieldid-put",
				requiresAuthentication: true,
				parameters: [
					{
						id: "FIELD_ID",
						displayName: "Field ID",
						description: "The ID of the custom field to update",
						required: true,
						dataType: ApiParameterDatatype.TEXT,
					},
					{
						id: "NAME",
						displayName: "Name",
						description: "The new name of the custom field",
						required: true,
						dataType: ApiParameterDatatype.TEXT,
					},
					{
						id: "DESCRIPTION",
						displayName: "Description",
						description: "The new description of the custom field",
						required: false,
						dataType: ApiParameterDatatype.TEXT,
					},
					{
						id: "SEARCHER_KEY",
						displayName: "Searcher Key",
						description:
							"The searcher to use for the custom field. This is required for fields of type `Text` or `Number`.",
						required: false,
						dataType: ApiParameterDatatype.TEXT,
					},
				],
			},
			{
				id: "GET_ISSUE_TRANSITIONS",
				name: "Get Issue Transitions",
				description: "Get transitions for an issue",
				documentationUrl:
					"https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/#api-rest-api-3-issue-issueidorkey-transitions-get",
				requiresAuthentication: true,
				parameters: [
					{
						id: "ISSUE_ID_OR_KEY",
						displayName: "Issue ID or Key",
						description:
							"The ID or key of the issue to retrieve transitions for.",
						required: true,
						dataType: ApiParameterDatatype.TEXT,
					},
					{
						id: "EXPAND",
						displayName: "Expand",
						description:
							"Use expand to include additional information about transitions in the response.",
						required: false,
						dataType: ApiParameterDatatype.TEXT,
					},
					{
						id: "TRANSITION_ID",
						displayName: "Transition ID",
						description:
							"Use transitionId to filter results to include only the specified transitions. This parameter accepts a comma-separated list.",
						required: false,
						dataType: ApiParameterDatatype.TEXT,
					},
				],
			},
			{
				id: "TRANSITION_ISSUE",
				name: "Transition Issue",
				description: "Transition an issue to a new status",
				documentationUrl:
					"https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/#api-rest-api-3-issue-issueidorkey-transitions-post",
				requiresAuthentication: true,
				parameters: [
					{
						id: "ISSUE_ID_OR_KEY",
						displayName: "Issue ID or Key",
						description:
							"The ID or key of the issue to be transitioned.",
						required: true,
						dataType: ApiParameterDatatype.TEXT,
					},
					{
						id: "TRANSITION",
						displayName: "Transition",
						description: "The ID or key of the transition.",
						required: true,
						dataType: ApiParameterDatatype.TEXT,
					},
					{
						id: "FIELDS",
						displayName: "Fields",
						description:
							"Fields to set as part of the transition, provided as a JSON object.",
						required: false,
						dataType: ApiParameterDatatype.TEXTAREA,
					},
				],
			},
		],
	},
	// MS Teams
	[IntegrationType.MS_TEAMS]: {
		name: "Microsoft Teams",
		icon: {
			src: "/ms_teams_logo.svg",
			isSquareIcon: true,
		},
		credential: {
			authType: AuthType.MS_TEAMS_OAUTH,
			// Note: changing the scopes will require the user to re-authenticate, i.e., remove the integration and add it again!
			// scope: "offline_access user.read channelmessage.send",
			scope: [
				"offline_access",
				"user.read",
				"channelmessage.send",
				"chat.create",
				"chat.read",
				"chatmessage.send",
				"directory.read.all",
				"team.readbasic.all",
				"user.read.all",
			].join(" "),
		},
		apis: [
			{
				id: "SEND_MESSAGE_IN_CHANNEL",
				name: "Send a Message in a Channel",
				description: "Send a message in a channel",
				documentationUrl:
					"https://learn.microsoft.com/en-us/graph/api/channel-post-messages?view=graph-rest-1.0&tabs=http#http-request",
				requiresAuthentication: true,
				parameters: [
					{
						id: "TEAM_ID",
						displayName: "Team ID",
						description:
							"The ID of the team to send the message to, e.g. e065XXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX",
						required: true,
						dataType: ApiParameterDatatype.TEXT,
					},
					{
						id: "CHANNEL_ID",
						displayName: "Channel ID",
						description:
							"The ID of the channel to send the message to, e.g. 19:XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX@thread.tacv2",
						required: true,
						dataType: ApiParameterDatatype.TEXT,
					},
					{
						id: "MESSAGE",
						displayName: "Message",
						description: "The message to send.",
						required: true,
						dataType: ApiParameterDatatype.TEXTAREA,
					},
				],
			},
			{
				id: "SEND_MESSAGE_IN_CHAT",
				name: "Send Message in Chat",
				description: "Send a message in a chat",
				documentationUrl:
					"https://learn.microsoft.com/en-us/graph/api/chat-post-messages?view=graph-rest-1.0&tabs=http",
				requiresAuthentication: true,
				parameters: [
					{
						id: "CHAT_ID",
						displayName: "Chat ID",
						description:
							"The ID of the chat. E.g. 19:2da4c29f6d7041eca70b638b43d45437@thread.v2",
						required: true,
						dataType: ApiParameterDatatype.TEXT,
					},
					{
						id: "MESSAGE",
						displayName: "Message",
						description: "The content of the message",
						required: true,
						dataType: ApiParameterDatatype.TEXTAREA,
					},
				],
			},
			{
				id: "SEND_REPLY_IN_CHANNEL",
				name: "Send Reply in Channel",
				description:
					"Send a reply to a message in a specified channel.",
				documentationUrl:
					"https://learn.microsoft.com/en-us/graph/api/chatmessage-post-replies?view=graph-rest-1.0&tabs=http",
				requiresAuthentication: true,
				parameters: [
					{
						id: "TEAM_ID",
						displayName: "Team ID",
						description:
							"The ID of the team, e.g. e065XXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX",
						required: true,
						dataType: ApiParameterDatatype.TEXT,
					},
					{
						id: "CHANNEL_ID",
						displayName: "Channel ID",
						description:
							"The ID of the channel, e.g. 19:XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX@thread.tacv2",
						required: true,
						dataType: ApiParameterDatatype.TEXT,
					},
					{
						id: "MESSAGE_ID",
						displayName: "Message ID",
						description:
							"The ID of the message to reply to, e.g. XXXXXXXXXXXXX",
						required: true,
						dataType: ApiParameterDatatype.TEXT,
					},
					{
						id: "MESSAGE",
						displayName: "Message",
						description: "The reply message content.",
						required: true,
						dataType: ApiParameterDatatype.TEXTAREA,
					},
				],
			},
			{
				id: "CREATE_CHAT",
				name: "Create Chat",
				description: "Create a new chat",
				documentationUrl:
					"https://learn.microsoft.com/en-us/graph/api/chat-post?view=graph-rest-1.0&tabs=http",
				requiresAuthentication: true,
				parameters: [
					{
						id: "CHAT_TYPE",
						displayName: "Chat Type",
						description:
							"The type of the chat: 'group' or 'oneOnOne'",
						required: true,
						dataType: ApiParameterDatatype.TEXT,
					},
					{
						id: "MEMBERS",
						displayName: "Members",
						description:
							"The members of the chat. Review docs for format.",
						required: true,
						dataType: ApiParameterDatatype.TEXTAREA,
					},
					{
						id: "TOPIC",
						displayName: "Topic",
						description: "The topic of the chat",
						required: false,
						dataType: ApiParameterDatatype.TEXT,
					},
				],
			},
			{
				id: "LIST_USERS",
				name: "List Users",
				description: "Retrieve a list of users in Microsoft Teams",
				documentationUrl:
					"https://learn.microsoft.com/en-us/graph/api/user-list?view=graph-rest-1.0&tabs=http",
				requiresAuthentication: true,
				parameters: [],
			},
			{
				id: "LIST_CHANNELS",
				name: "List Channels",
				description:
					"Retrieve the list of channels in a Microsoft Teams team",
				documentationUrl:
					"https://learn.microsoft.com/en-us/graph/api/channel-list?view=graph-rest-1.0&tabs=http#http-request",
				requiresAuthentication: true,
				parameters: [
					{
						id: "TEAM_ID",
						displayName: "Team ID",
						description:
							"The ID of the team to send the message to, e.g. e065XXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX",
						required: true,
						dataType: ApiParameterDatatype.TEXT,
					},
				],
			},
			{
				id: "LIST_TEAMS",
				name: "List Teams",
				description: "Retrieve a list of all teams in Microsoft Teams",
				documentationUrl:
					"https://learn.microsoft.com/en-us/graph/teams-list-all-teams?context=graph%2Fapi%2F1.0&view=graph-rest-1.0#request",
				requiresAuthentication: true,
				parameters: [],
			},
			{
				id: "LIST_CHATS",
				name: "List Chats",
				description: "Retrieve a list of chats in Microsoft Teams",
				documentationUrl:
					"https://learn.microsoft.com/en-us/graph/api/chat-list?view=graph-rest-1.0&tabs=http#http-request",
				requiresAuthentication: true,
				parameters: [],
			},
		],
	},
	// MS Defender for Cloud
	[IntegrationType.MS_DEFENDER_FOR_CLOUD]: {
		name: "Microsoft Defender for Cloud",
		icon: {
			src: "/ms_defender_for_cloud_logo.svg",
			isSquareIcon: true,
		},
		credential: {
			authType: AuthType.SECRET,
			parameters: [
				{
					id: "TENANT_ID",
					displayName: "Your Tenant ID",
				},
				{
					id: "CLIENT_ID",
					displayName: "Your Client ID",
				},
				{
					id: "CLIENT_SECRET",
					displayName: "Your Client Secret",
				},
			],
		},
		apis: [
			{
				id: "LIST_ALERTS",
				name: "List Alerts",
				description:
					"List all the alerts that are associated with a subscription ID",
				documentationUrl:
					"https://learn.microsoft.com/en-us/rest/api/defenderforcloud/alerts/list?view=rest-defenderforcloud-2022-01-01&tabs=HTTP",
				requiresAuthentication: true,
				parameters: [
					{
						id: "SUBSCRIPTION_ID",
						displayName: "Subscription ID",
						description: "The ID of the Azure subscription.",
						required: true,
						dataType: ApiParameterDatatype.TEXT,
					},
					{
						id: "RESOURCE_GROUP",
						displayName: "Resource Group",
						description: "The name of the resource group.",
						required: false,
						dataType: ApiParameterDatatype.TEXT,
					},
					{
						id: "ASC_LOCATION",
						displayName: "ASC Location",
						description:
							"The location of the Azure Security Center.",
						required: false,
						dataType: ApiParameterDatatype.TEXT,
					},
					{
						id: "PAGE_LIMIT",
						displayName: "Page Limit",
						description:
							"The maximum number of pages to fetch. One page consists of up to 100 alerts. Default: 1",
						required: false,
						dataType: ApiParameterDatatype.NUMBER,
					},
				],
			},
			{
				id: "UPDATE_ALERT_STATUS",
				name: "Update Alert Status",
				description: "Update the status of an alert.",
				documentationUrl:
					"https://learn.microsoft.com/en-us/rest/api/defenderforcloud/alerts/list?view=rest-defenderforcloud-2022-01-01&tabs=HTTP",
				requiresAuthentication: true,
				parameters: [
					{
						id: "ALERT_ID",
						displayName: "Alert ID",
						description: "The ID of the alert.",
						required: true,
						dataType: ApiParameterDatatype.TEXT,
					},
					{
						id: "ALERT_STATUS",
						displayName: "Alert Status",
						description:
							"The status of the alert. Allowed values: 'Active', 'Resolved', 'Dismissed'.",
						required: true,
						dataType: ApiParameterDatatype.TEXT,
					},
				],
			},
			{
				id: "GET_ALERT",
				name: "Get Alert",
				description: "Get an alert.",
				documentationUrl:
					"https://learn.microsoft.com/en-us/rest/api/defenderforcloud/alerts/get-resource-group-level?view=rest-defenderforcloud-2022-01-01&tabs=HTTP",
				requiresAuthentication: true,
				parameters: [
					{
						id: "ALERT_ID",
						displayName: "Alert ID",
						description: "The ID of the alert.",
						required: true,
						dataType: ApiParameterDatatype.TEXT,
					},
				],
			},
		],
	},
	// ...
};
