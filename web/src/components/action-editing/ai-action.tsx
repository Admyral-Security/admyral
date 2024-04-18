import { Flex, Select, Text, TextArea, TextField } from "@radix-ui/themes";
import CopyText from "../copy-text";
import { cloneDeep } from "lodash";
import { generateReferenceHandle } from "@/lib/workflows";
import { useEffect, useState } from "react";
import { AiActionData } from "@/lib/types";

export interface AiActionProps {
	actionId: string;
	updateNodeName: (name: string) => void;
}

// TODO: prompt templates
export default function AiAction({ actionId, updateNodeName }: AiActionProps) {
	const [aiActionData, setAiActionData] = useState<AiActionData>({
		actionId: "",
		workflowId: "",
		actionName: "",
		referenceHandle: "",
		actionDescription: "",
		actionDefinition: {
			prompt: "",
		},
	});

	useEffect(() => {
		// TODO: load data
		console.log("LOADING DATA");
		setAiActionData({
			actionId: "sdaasdasddas",
			workflowId: "sddasdasdasd",
			actionName: "my awesome api call",
			referenceHandle: "gfdkrgt",
			actionDescription: "this is an awesome api call",
			actionDefinition: {
				prompt: "Please classify the following text: ",
			},
		});
	}, [actionId]);

	// TODO: in regular intervals, save the data if it changed!

	return (
		<Flex direction="column" gap="4" p="4">
			<Flex direction="column" gap="2">
				<Text>Name</Text>
				<TextField.Root
					variant="surface"
					value={aiActionData.actionName}
					onChange={(event) => {
						// Update name in the state
						const clonedData = cloneDeep(aiActionData);
						clonedData.actionName = event.target.value;
						clonedData.referenceHandle = generateReferenceHandle(
							event.target.value,
						);
						setAiActionData(clonedData);

						// Update name in the workflow node
						updateNodeName(event.target.value);
					}}
				/>
			</Flex>

			<Flex direction="column" gap="2">
				<Text>Reference Handle</Text>
				<CopyText text={aiActionData.referenceHandle} />
			</Flex>

			<Flex direction="column" gap="2">
				<Text>Description</Text>
				<TextArea
					size="2"
					variant="surface"
					resize="vertical"
					value={aiActionData.actionDescription}
					onChange={(event) => {
						const clonedData = cloneDeep(aiActionData);
						clonedData.actionDescription = event.target.value;
						setAiActionData(clonedData);
					}}
				/>
			</Flex>

			<Flex direction="column" gap="2">
				<Flex justify="between" align="center">
					<Text>Prompt</Text>

					<Select.Root
						value=""
						onValueChange={(template) => {
							// inject template into prompt field
							const clonedData = cloneDeep(aiActionData);
							clonedData.actionDefinition.prompt += template;
							setAiActionData(clonedData);
						}}
					>
						<Select.Trigger placeholder="Templates" />
						<Select.Content>
							<Select.Item value="phishing">
								Phishing Classification
							</Select.Item>
						</Select.Content>
					</Select.Root>
				</Flex>
				<TextArea
					variant="surface"
					value={aiActionData.actionDefinition.prompt}
					style={{ height: "100px" }}
					onChange={(event) => {
						const clonedData = cloneDeep(aiActionData);
						clonedData.actionDefinition.prompt = event.target.value;
						setAiActionData(clonedData);
					}}
				/>
			</Flex>
		</Flex>
	);
}
