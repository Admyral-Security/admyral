import { Flex, Select, Text, TextArea, TextField } from "@radix-ui/themes";
import CopyText from "../copy-text";
import { cloneDeep } from "lodash";
import { generateReferenceHandle } from "@/lib/workflow-node";
import { AiActionData, LLM, LLM_MODELS, getLLMLabel } from "@/lib/types";
import useWorkflowStore from "@/lib/workflow-store";
import {
	REFERENCE_HANDLE_EXAMPLE1,
	REFERENCE_HANDLE_EXAMPLE2,
	REFERENCE_HANDLE_EXPLANATION,
} from "@/lib/constants";

export interface AiActionProps {
	id: string;
}

// TODO: prompt templates
export default function AiAction({ id }: AiActionProps) {
	const { data, updateData } = useWorkflowStore((state) => ({
		data: state.nodes.find((node) => node.id === id)?.data as AiActionData,
		updateData: (updatedData: AiActionData) =>
			state.updateNodeData(id, updatedData),
	}));

	return (
		<Flex direction="column" gap="4" p="4">
			<Flex direction="column" gap="2">
				<Text>Name</Text>
				<TextField.Root
					variant="surface"
					value={data.actionName}
					onChange={(event) => {
						// Update name in the state
						const clonedData = cloneDeep(data);
						clonedData.actionName = event.target.value;
						clonedData.referenceHandle = generateReferenceHandle(
							event.target.value,
						);
						updateData(clonedData);
					}}
				/>
			</Flex>

			<Flex direction="column" gap="2">
				<Text>Reference Handle</Text>
				<Text color="gray" weight="light" size="1">
					{REFERENCE_HANDLE_EXPLANATION}
				</Text>
				<Text color="gray" weight="light" size="1">
					{REFERENCE_HANDLE_EXAMPLE1}
				</Text>
				<Text color="gray" weight="light" size="1">
					{REFERENCE_HANDLE_EXAMPLE2}
				</Text>
				<CopyText text={data.referenceHandle} />
			</Flex>

			<Flex direction="column" gap="2">
				<Text>Description</Text>
				<TextArea
					size="2"
					variant="surface"
					resize="vertical"
					value={data.actionDescription}
					style={{ height: "250px" }}
					onChange={(event) => {
						const clonedData = cloneDeep(data);
						clonedData.actionDescription = event.target.value;
						updateData(clonedData);
					}}
				/>
			</Flex>

			<Flex direction="column" gap="2">
				<Text>Model</Text>
				<Select.Root
					value={data.actionDefinition.model}
					onValueChange={(model) => {
						const clonedData = cloneDeep(data);
						clonedData.actionDefinition.model = model as LLM;
						updateData(clonedData);
					}}
					defaultValue={LLM_MODELS[0]}
				>
					<Select.Trigger />
					<Select.Content>
						{LLM_MODELS.map((model) => (
							<Select.Item
								key={`ai_action_model_${model}`}
								value={model}
							>
								{getLLMLabel(model)}
							</Select.Item>
						))}
					</Select.Content>
				</Select.Root>
			</Flex>

			<Flex direction="column" gap="2">
				<Flex justify="between" align="center">
					<Text>Prompt</Text>

					<Select.Root
						value=""
						onValueChange={(template) => {
							// inject template into prompt field
							const clonedData = cloneDeep(data);
							clonedData.actionDefinition.prompt += template;
							updateData(clonedData);
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
					size="2"
					resize="vertical"
					variant="surface"
					value={data.actionDefinition.prompt}
					style={{ height: "250px" }}
					onChange={(event) => {
						const clonedData = cloneDeep(data);
						clonedData.actionDefinition.prompt = event.target.value;
						updateData(clonedData);
					}}
				/>
			</Flex>
		</Flex>
	);
}
