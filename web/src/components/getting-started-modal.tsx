import { Button, Dialog, Flex, Grid, Separator, Text } from "@radix-ui/themes";
import WorkflowTemplateCard from "./workflow-templates-card";
import { WorkflowTemplate } from "@/lib/types";

interface GettingStartedModalProps {
	open: boolean;
	setOpen: (open: boolean) => void;
	templates: WorkflowTemplate[];
	loading: boolean;
	handleCreateNewWorkflow: () => void;
}

export default function GettingStartedModal({
	open,
	setOpen,
	templates,
	loading,
	handleCreateNewWorkflow,
}: GettingStartedModalProps) {
	return (
		<Dialog.Root open={open} onOpenChange={setOpen}>
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
							style={{
								height: "24vh",
							}}
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
											callback={() => setOpen(false)}
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
									size="2"
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
