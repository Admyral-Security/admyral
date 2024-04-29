import { importWorkflowFromTemplate } from "@/lib/api";
import { Badge, Box, Card, Flex, Grid, Text } from "@radix-ui/themes";
import Image from "next/image";

interface WorkflowTemplateCardProps {
	workflowId: string;
	templateHeadline: string;
	templateDescription: string;
	category: string;
	icon: string;
	callback?: () => void;
}

function getIcon(icon: string) {
	switch (icon) {
		case "YARAify":
			return (
				<Image
					src="/abusech_yaraify_logo.svg"
					alt="YARAify"
					height="32"
					width="64"
				/>
			);
		case "Threatpost":
			return (
				<Image
					src="/threatpost_logo.svg"
					alt="Threatpost"
					height="32"
					width="64"
				/>
			);
		case "PhishReport":
			return (
				<Image
					src="/phish_report.svg"
					alt="PhishReport"
					height="32"
					width="32"
				/>
			);
		case "VirusTotal":
			return (
				<Image
					src="/virustotal-icon.svg"
					alt="VirusTotal"
					height="32"
					width="32"
				/>
			);

		default:
			return (
				<Image src="/logo.svg" alt="Admyral" height="32" width="32" />
			);
	}
}

export default function WorkflowTemplateCard({
	workflowId,
	templateHeadline,
	templateDescription,
	category,
	icon,
	callback,
}: WorkflowTemplateCardProps) {
	const handleImportWorkflow = async () => {
		try {
			await importWorkflowFromTemplate(workflowId);
			if (callback) {
				callback();
			}
		} catch (error) {
			alert("Failed to import workflow from template!");
		}
	};

	return (
		<Card
			style={{
				width: "500px",
				height: "130px",
				cursor: "pointer",
			}}
			onClick={handleImportWorkflow}
		>
			<Grid
				columns="76px 1fr"
				height="100%"
				gap="4"
				justify="center"
				align="start"
			>
				<Flex
					height="100%"
					width="100%"
					justify="center"
					align="center"
				>
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
							{getIcon(icon)}
						</Flex>
					</Card>
				</Flex>

				<Flex direction="column" gap="1" justify="start" align="start">
					<Flex gap="4" justify="start" align="center">
						<Text weight="bold">{templateHeadline}</Text>
						<Box width="auto">
							<Badge color="blue">{category}</Badge>
						</Box>
					</Flex>

					<Text
						style={{
							color: "var(--Neutral-color-Neutral-9, #8B8D98)",
						}}
						size="2"
					>
						{templateDescription}
					</Text>
				</Flex>
			</Grid>
		</Card>
	);
}
