import { Cross1Icon } from "@radix-ui/react-icons";
import {
	Button,
	Card,
	Dialog,
	Flex,
	Grid,
	Spinner,
	Text,
} from "@radix-ui/themes";
import RightArrowIcon from "./icons/right-arrow-icon";
import { loadWorkflowTemplates } from "@/lib/api";
import { useEffect, useState } from "react";
import { WorkflowTemplate } from "@/lib/types";
import WorkflowTemplateCard from "./workflow-templates-card";
import { errorToast } from "@/lib/toast";

function WorkflowTemplatesDialog() {
	const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		loadWorkflowTemplates()
			.then((templates) => {
				setTemplates(templates);
			})
			.catch((error) => {
				errorToast(
					"Failed to load workflow templates. Please refresh the page.",
				);
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
