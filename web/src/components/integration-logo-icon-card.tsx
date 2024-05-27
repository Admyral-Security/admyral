import { IntegrationType } from "@/lib/types";
import { Card, Flex } from "@radix-ui/themes";
import Image from "next/image";

function getIcon(integration?: IntegrationType | null) {
	switch (integration) {
		case IntegrationType.YARAIFY:
			return (
				<Image
					src="/abusech_yaraify_logo.svg"
					alt="YARAify"
					height="32"
					width="64"
				/>
			);

		case IntegrationType.THREATPOST:
			return (
				<Image
					src="/threatpost_logo.svg"
					alt="Threatpost"
					height="32"
					width="64"
				/>
			);

		case IntegrationType.PHISH_REPORT:
			return (
				<Image
					src="/phish_report.svg"
					alt="PhishReport"
					height="32"
					width="32"
				/>
			);

		case IntegrationType.VIRUSTOTAL:
			return (
				<Image
					src="/virustotal-icon.svg"
					alt="VirusTotal"
					height="32"
					width="32"
				/>
			);

		case IntegrationType.ALIENVAULT_OTX:
			return (
				<Image
					src="/alienvault_otx_icon.png"
					alt="AlienVault OTX"
					height="32"
					width="32"
				/>
			);

		case IntegrationType.SLACK:
			return (
				<Image
					src="/slack_logo_color.svg"
					alt="Slack"
					height="32"
					width="32"
				/>
			);

		case IntegrationType.JIRA:
			return (
				<Image src="/jira_logo.svg" alt="Jira" height="32" width="32" />
			);

		default:
			return (
				<Image src="/logo.svg" alt="Admyral" height="32" width="32" />
			);
	}
}

export default function IntegrationLogoIconCard({
	integration,
}: {
	integration?: IntegrationType | null;
}) {
	return (
		<Card
			style={{
				padding: 0,
				borderRadius: "var(--Radius-2, 4px)",
				height: "80px",
				width: "80px",
			}}
		>
			<Flex
				style={{
					backgroundColor:
						"var(--Semantic-colors-Warning-Alpha-2, rgba(255, 170, 1, 0.07))",
					width: "100%",
					height: "100%",
				}}
				justify="center"
				align="center"
			>
				{getIcon(integration)}
			</Flex>
		</Card>
	);
}
