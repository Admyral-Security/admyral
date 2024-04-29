"use client";

import { createNewWorkflow, loadWorkflowTemplates } from "@/lib/api";
import { Button, Dialog, Flex, Grid, Text } from "@radix-ui/themes";
import { useEffect, useState } from "react";
import { WorkflowTemplate } from "@/lib/types";
import WorkflowTemplateCard from "./workflow-templates-card";
import { Cross1Icon } from "@radix-ui/react-icons";
import useGettingStartedStore from "@/lib/getting-started-store";

export interface CreateNewWorkflowButtonProps {
	size: "1" | "2" | "3" | "4";
}

export default function CreateNewWorkflowButton({
	size,
}: CreateNewWorkflowButtonProps) {
	const [showModal, setShowModal] = useState<boolean>(false);
	const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
	const [loading, setLoading] = useState<boolean>(false);
	const { showGettingStarted, clearShowGettingStarted } =
		useGettingStartedStore((state) => ({
			showGettingStarted: state.showGettingStarted,
			clearShowGettingStarted: () => state.setShowGettingStarted(false),
		}));

	useEffect(() => {
		loadWorkflowTemplates()
			.then((templates) => {
				setTemplates(templates);
			})
			.catch((error) => {
				alert("Failed to load workflow templates!");
			});
	}, []);

	useEffect(() => {
		setShowModal(showGettingStarted);
	}, [showGettingStarted]);

	const handleCreateNewWorkflow = async () => {
		setLoading(true);
		try {
			await createNewWorkflow();
			clearShowGettingStarted();
		} catch (error) {
			alert("Failed to create new workflow. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	return (
		<Dialog.Root open={showModal} onOpenChange={setShowModal}>
			<Dialog.Trigger>
				<Button
					size={size}
					variant="solid"
					style={{ cursor: "pointer" }}
				>
					Create New Workflow
				</Button>
			</Dialog.Trigger>

			<Dialog.Content maxWidth="1116px">
				<Flex justify="between" align="center">
					<Text weight="bold" size="5">
						Two Options on Getting Started
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

				<Grid columns="2" gap="6" mt="4">
					<Flex
						direction="column"
						justify="between"
						align="center"
						height="642px"
						gap="4"
					>
						<Text size="4">A. Start from Scratch</Text>

						<Flex
							direction="column"
							gap="4"
							height="100%"
							align="center"
							justify="center"
						>
							<Text size="4">
								How to Build Your First Workflow
							</Text>
							<iframe
								width="518"
								height="315"
								src="https://www.youtube.com/embed/s1jH6sD0dwc?si=oM4RY77oAUIC9_00"
								title="Admyral - Build your first workflow"
								frameBorder="0"
								allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
								referrerPolicy="strict-origin-when-cross-origin"
								allowFullscreen
							></iframe>
						</Flex>

						<Flex width="148px">
							<Button
								loading={loading}
								size={size}
								variant="solid"
								style={{ cursor: "pointer" }}
								onClick={handleCreateNewWorkflow}
							>
								Build from Scratch
							</Button>
						</Flex>
					</Flex>

					<Flex
						direction="column"
						justify="between"
						align="center"
						height="642px"
						gap="4"
					>
						<Text size="4">B. Select a Pre-Built Workflow</Text>
						<Flex
							direction="column"
							gap="4"
							style={{ flex: 1, overflowY: "auto" }}
						>
							<Flex direction="column" gap="3">
								{templates.map((template) => (
									<WorkflowTemplateCard
										key={`get_started_workflow_templates_${template.workflowId}`}
										workflowId={template.workflowId}
										templateHeadline={
											template.templateHeadline
										}
										templateDescription={
											template.templateDescription
										}
										category={template.category}
										icon={template.icon}
										callback={clearShowGettingStarted}
									/>
								))}
							</Flex>
						</Flex>
					</Flex>
				</Grid>
			</Dialog.Content>
		</Dialog.Root>
	);
}
