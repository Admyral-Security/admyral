import Image from "next/image";

const NAMESPACE_ICON_MAPPING: Record<string, string> = {
	Admyral: "/admyral_logo.svg",
	Slack: "/slack_logo.svg",
	"AlienVault OTX": "/alienvault_otx_icon.png",
	GreyNoise: "/greynoise_logo.svg",
	VirusTotal: "/virustotal-icon.svg",
	Jira: "/jira_logo.svg",
	OpsGenie: "/opsgenie_logo.svg",
	PagerDuty: "/pagerduty_logo.jpeg",
	"Amazon Inspector2": "/amazon_inspector2_logo.jpeg",
	Snyk: "/snyk-logo.jpeg",
	Anthropic: "/anthropic_logo.jpeg",
	"Azure OpenAI": "/azure_logo.svg",
	"Mistral AI": "/mistralai_logo.png",
	OpenAI: "/openai_logo.svg",
	"Microsoft Defender for Endpoint": "/ms_defender_logo.png",
	"Microsoft Defender for Cloud": "/ms_defender_for_cloud_logo.svg",
	"Abnormal Security": "/abnormal_logo.svg",
	"Microsoft Sentinel": "/ms_sentinel_logo.svg",
	Okta: "/okta_logo.png",
	SentinelOne: "/sentinelone_logo.png",
	Wiz: "/wiz_logo.png",
	Retool: "/retool_logo.png",
	"1Password": "/1password_logo.svg",
	GitHub: "/github_logo.svg",
	AbuseIPDB: "/abuseipdb-logo.svg",
	AWS: "/aws_logo.svg",
	Database: "/database_icon.svg",
	"Google Drive": "/google_drive_icon.svg",
	"Microsoft Intune": "/ms_intunes_logo.svg",
	Kandji: "/kandji_logo.svg",
	Zendesk: "/zendesk_logo.svg",
	LeakCheck: "/leakcheck_logo.png",
	Azure: "/azure_logo.svg",
	Controls: "/control-icon.svg",
};

export default function NamespaceIcon({ namespace }: { namespace: string }) {
	const path = NAMESPACE_ICON_MAPPING[namespace];
	if (!path) {
		return (
			<Image
				src={NAMESPACE_ICON_MAPPING["Admyral"]}
				alt={namespace}
				width={18}
				height={18}
			/>
		);
	}
	return <Image src={path} alt={namespace} width={18} height={18} />;
}
