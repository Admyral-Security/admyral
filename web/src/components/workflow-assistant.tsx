"use client";

import { useState } from "react";
import { Badge, Button, Card, Flex, Text, TextArea } from "@radix-ui/themes";
import AssistantIcon from "./icons/assistant-icon";
import { Cross1Icon } from "@radix-ui/react-icons";
import { generateWorkflowGraph } from "@/lib/workflow-generation";
import useWorkflowStore from "@/lib/workflow-store";
import useWorkflowAssistantStore from "@/lib/workflow-assistant-store";

const WORKLFOW_ASSISTANT_PLACEHOLDER = `Describe the workflow you want to generate. Make sure to specify which tools you want to use.

Example:
Create a workflow that takes an IP address as input, runs it through the following services: AbuseIPDB, VirusTotal, GreyNoise, and Pulsedive. Then, generate a report and send me the report via email.`;

export default function WorkflowAssistant() {
	const [userInput, setUserInput] = useState<string>("");
	const [isLoading, setIsLoading] = useState<boolean>(false);

	const { closeAssistant } = useWorkflowAssistantStore((state) => ({
		closeAssistant: () => state.setOpenAssistant(false),
	}));

	const { setNodes, setEdges, getId, deleteWorkflow } = useWorkflowStore(
		(state) => ({
			setNodes: state.setNodes,
			setEdges: state.setEdges,
			getId: state.getId,
			deleteWorkflow: state.deleteWorkflow,
		}),
	);

	const handleGenerateWorkflow = async () => {
		setIsLoading(true);
		try {
			const [generatedNodes, generatedEdges] =
				await generateWorkflowGraph(userInput);

			// we need to remap the node and edge ids to mark them as new, i.e.,
			// mark them as not yet persisted
			const nodeIdRemapping: Record<string, string> = {};
			const newNodes = generatedNodes.map((node) => {
				let id = getId();
				nodeIdRemapping[node.id] = id;
				return { ...node, id, data: { ...node.data, actionId: id } };
			});
			const newEdges = generatedEdges.map((edge) => ({
				...edge,
				id: getId(),
				source: nodeIdRemapping[edge.source],
				target: nodeIdRemapping[edge.target],
			}));

			// We first need to delete the current workflow before setting the new one
			// otherwise this could lead to inconsistencies with the already persisted state
			deleteWorkflow();
			setNodes(newNodes);
			setEdges(newEdges);

			closeAssistant();
		} catch (error: any) {
			if (
				error.message ===
				"Quota limit exceeded. You have reached the maximum number of workflow generations per day."
			) {
				alert(
					"Quota limit exceeded. You have reached the maximum number of workflow generations per day.",
				);
			} else {
				alert("Failed to generate workflow. Please try again later.");
			}
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<Card
			style={{
				position: "fixed",
				left: "316px",
				top: "68px",
				zIndex: 50,
				width: "352px",
				backgroundColor: "#F5F2FF",
				height: "calc(50vh)",
				maxHeight: "600px",
				padding: 0,
			}}
			size="2"
		>
			<Flex direction="column" p="4" width="100%" height="100%" gap="3">
				<Flex justify="between" align="center">
					<Flex gap="2" justify="start" align="center">
						<Text weight="medium" size="2">
							Workflow Assistant
						</Text>
						<Badge variant="outline" color="violet">
							Experimental
						</Badge>
					</Flex>

					<Button
						size="2"
						variant="soft"
						color="gray"
						style={{
							cursor: "pointer",
							paddingLeft: 8,
							paddingRight: 8,
						}}
						onClick={closeAssistant}
					>
						<Cross1Icon width="16" height="16" />
					</Button>
				</Flex>

				<Flex width="100%" height="100%">
					<TextArea
						rows={10}
						value={userInput}
						onChange={(e) => setUserInput(e.target.value)}
						style={{
							width: "100%",
							height: "100%",
							whiteSpace: "pre-line",
						}}
						placeholder={WORKLFOW_ASSISTANT_PLACEHOLDER}
					/>
				</Flex>

				<Flex width="100%">
					<Flex width="100%">
						<Button
							style={{
								backgroundColor: "#6E56CF",
								width: "100%",
								color: "white",
							}}
							onClick={handleGenerateWorkflow}
							loading={isLoading}
						>
							<AssistantIcon fill="white" />
							<Text>Generate New Workflow</Text>
						</Button>
					</Flex>
				</Flex>
			</Flex>
		</Card>
	);
}
