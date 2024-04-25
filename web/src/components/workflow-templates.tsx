import { Cross1Icon } from "@radix-ui/react-icons";
import {
	Badge,
	Box,
	Button,
	Card,
	Dialog,
	Flex,
	Grid,
	Spinner,
	Text,
} from "@radix-ui/themes";
import RightArrowIcon from "./icons/right-arrow-icon";
import { importWorkflowFromTemplate, loadWorkflowTemplates } from "@/lib/api";
import { useEffect, useState } from "react";
import { WorkflowTemplate } from "@/lib/types";
import Image from "next/image";

interface WorkflowTemplateCardProps {
	workflowId: string;
	templateHeadline: string;
	templateDescription: string;
	category: string;
	icon: string;
}

function getIcon(icon: string) {
	switch (icon) {
		default:
			// TODO: use <Image />
			// return <Image src="/logo.svg" alt="Admyral" />;
			return <img src="/logo.svg" alt="Admyral" />;
	}
}

function WorkflowTemplateCard({
	workflowId,
	templateHeadline,
	templateDescription,
	category,
	icon,
}: WorkflowTemplateCardProps) {
	const handleImportWorkflow = async () => {
		try {
			await importWorkflowFromTemplate(workflowId);
		} catch (error) {
			alert("Failed to import workflow from template!");
		}
	};

	return (
		<Card
			style={{
				width: "500px",
				height: "100px",
				cursor: "pointer",
			}}
			onClick={handleImportWorkflow}
		>
			<Grid columns="76px 1fr" height="100%" gap="4">
				<Card
					style={{
						padding: 0,
						borderRadius: "var(--Radius-2, 4px)",
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

function WorkflowTemplatesDialog() {
	const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		loadWorkflowTemplates()
			.then((templates) => {
				setTemplates(templates);
			})
			.catch((error) => {
				alert("Failed to load workflow templates!");
			})
			.finally(() => setIsLoading(false));
	}, []);

	return (
		<>
			<Flex direction="column" gap="3">
				<Flex justify="between" align="center">
					<Text weight="bold" size="5">
						Workflow Templates
					</Text>

					<Dialog.Close>
						<Button
							size="2"
							variant="soft"
							color="gray"
							style={{
								cursor: "pointer",
								paddingLeft: 8,
								paddingRight: 8,
							}}
						>
							<Cross1Icon width="16" height="16" />
						</Button>
					</Dialog.Close>
				</Flex>

				<Text size="3">Click on a template below to import it.</Text>
			</Flex>

			{isLoading && (
				<Flex justify="center" align="center">
					<Spinner size="3" />
				</Flex>
			)}

			<Grid columns="2" gap="4" mt="5">
				{templates.map((template) => (
					<WorkflowTemplateCard
						key={`workflow_templates_${template.workflowId}`}
						workflowId={template.workflowId}
						templateHeadline={template.templateHeadline}
						templateDescription={template.templateDescription}
						category={template.category}
						icon={template.icon}
					/>
				))}
			</Grid>
		</>
	);
}

export default function WorkflowTemplates() {
	return (
		<Dialog.Root>
			<Dialog.Trigger>
				<Card
					style={{
						padding: "8px",
					}}
					asChild
				>
					<button
						type="button"
						style={{ cursor: "pointer", width: "100%" }}
					>
						<Flex justify="between" align="center" width="100%">
							<Text size="3" weight="medium">
								Workflow Templates
							</Text>

							<RightArrowIcon />
						</Flex>
					</button>
				</Card>
			</Dialog.Trigger>

			<Dialog.Content maxWidth="1064px">
				<WorkflowTemplatesDialog />
			</Dialog.Content>
		</Dialog.Root>
	);
}
