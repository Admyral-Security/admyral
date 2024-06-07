"use client";

import { createNewWorkflow, loadWorkflowTemplates } from "@/lib/api";
import { Button, Dialog, Flex, Grid, Separator, Text } from "@radix-ui/themes";
import { useEffect, useState } from "react";
import { WorkflowTemplate } from "@/lib/types";
import WorkflowTemplateCard from "./workflow-templates-card";
import { Cross1Icon } from "@radix-ui/react-icons";
import useGettingStartedStore from "@/lib/getting-started-store";
import { errorToast, successToast } from "@/lib/toast";

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
				errorToast(
					"Failed to load workflow templates. Please refresh the page.",
				);
			});
	}, []);

	useEffect(() => {
		setShowModal(showGettingStarted);
	}, [showGettingStarted]);

	const handleCreateNewWorkflow = async () => {
		setLoading(true);
		try {
			await createNewWorkflow();
			successToast("New workflow created successfully.");
			clearShowGettingStarted();
		} catch (error) {
			errorToast("Failed to create new workflow. Please try again.");
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

			<Dialog.Content maxWidth="607px" style={{ padding: 0 }}>
				<Flex
					justify="center"
					align="center"
					direction="column"
					width="100%"
					gap="2"
					p="0"
				>
					<Flex
						direction="column"
						height="100%"
						align="center"
						justify="start"
						p="0"
					>
						<iframe
							width="607"
							height="315"
							src="https://www.youtube.com/embed/s1jH6sD0dwc?si=oM4RY77oAUIC9_00"
							title="Admyral - Build your first workflow"
							frameBorder="0"
							allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
							referrerPolicy="strict-origin-when-cross-origin"
							allowFullScreen
							style={{ borderRadius: "4px" }}
						></iframe>
					</Flex>

					<Flex
						direction="column"
						justify="start"
						align="start"
						gap="4"
						width="100%"
						p="5"
					>
						<Text weight="bold" size="5">
							Getting Started
						</Text>

						<Text weight="light" size="5">
							Select a workflow template
						</Text>

						<Flex
							direction="column"
							justify="between"
							align="center"
							height="418px"
							gap="4"
						>
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

						<Grid
							columns="1fr 38px 1fr"
							justify="center"
							width="100%"
						>
							<Separator my="3" size="4" />
							<Flex justify="center" align="start">
								<Text
									size="4"
									style={{
										color: "var(--Neutral-color-Neutral-Alpha-6, rgba(1, 1, 46, 0.13))",
									}}
								>
									or
								</Text>
							</Flex>
							<Separator my="3" size="4" />
						</Grid>

						<Flex justify="center" align="center" width="100%">
							<Flex width="148px">
								<Button
									loading={loading}
									size={size}
									variant="solid"
									style={{ cursor: "pointer" }}
									onClick={handleCreateNewWorkflow}
								>
									Start from Scratch
								</Button>
							</Flex>
						</Flex>
					</Flex>
				</Flex>
			</Dialog.Content>
		</Dialog.Root>
	);
}
