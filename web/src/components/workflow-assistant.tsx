"use client";

import { useState } from "react";
import { Badge, Button, Card, Flex, Text, TextArea } from "@radix-ui/themes";
import AssistantIcon from "./icons/assistant-icon";
import { Cross1Icon } from "@radix-ui/react-icons";
import { generateWorkflowGraph } from "@/lib/workflow-generation";
import useWorkflowStore from "@/lib/workflow-store";
import useWorkflowAssistantStore from "@/lib/workflow-assistant-store";

export default function WorkflowAssistant() {
	const [userInput, setUserInput] = useState<string>("");
	const [isLoading, setIsLoading] = useState<boolean>(false);

	const { closeAssistant } = useWorkflowAssistantStore((state) => ({
		closeAssistant: () => state.setOpenAssistant(false),
	}));

	const { setNodes, setEdges, getId } = useWorkflowStore((state) => ({
		setNodes: state.setNodes,
		setEdges: state.setEdges,
		getId: state.getId,
	}));

	const handleGenerateWorkflow = async () => {
		setIsLoading(true);
		try {
			const [generatedNodes, generatedEdges] =
				await generateWorkflowGraph(userInput);

			const nodeIdRemapping: Record<string, string> = {};
			const nodes = generatedNodes.map((node) => {
				let id = getId();
				nodeIdRemapping[node.id] = id;
				return { ...node, id, data: { ...node.data, actionId: id } };
			});
			const edges = generatedEdges.map((edge) => ({
				...edge,
				id: getId(),
				source: nodeIdRemapping[edge.source],
				target: nodeIdRemapping[edge.target],
			}));

			setNodes(nodes);
			setEdges(edges);

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
						value={userInput}
						onChange={(e) => setUserInput(e.target.value)}
						style={{ width: "100%", height: "100%" }}
						placeholder="Describe your process or click on the suggestions below!"
					/>
				</Flex>

				<Flex width="100%">
					<Flex width="100%">
						<Button
							style={{
								backgroundColor: "#6E56CF",
								width: "100%",
							}}
							onClick={handleGenerateWorkflow}
							loading={isLoading}
						>
							<AssistantIcon fill="white" />
							<Text>Generate Workflow</Text>
						</Button>
					</Flex>
				</Flex>
			</Flex>
		</Card>
	);
}
