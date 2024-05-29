import { importWorkflowFromTemplate } from "@/lib/api";
import { Badge, Box, Card, Flex, Grid, Text } from "@radix-ui/themes";
import IntegrationLogoIconCard from "./integration-logo-icon-card";
import { IntegrationType } from "@/lib/integrations";

interface WorkflowTemplateCardProps {
	workflowId: string;
	templateHeadline: string;
	templateDescription: string;
	category: string;
	icon?: IntegrationType | null;
	callback?: () => void;
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
					<IntegrationLogoIconCard integration={icon} />
				</Flex>

				<Flex direction="column" gap="1" justify="start" align="start">
					<Flex gap="4" justify="start" align="center">
						<Text weight="bold" size="2">
							{templateHeadline}
						</Text>
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
