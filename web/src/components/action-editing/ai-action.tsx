import { Flex, Select, Text, TextArea, TextField } from "@radix-ui/themes";
import CopyText from "../copy-text";
import { cloneDeep } from "lodash";
import { generateReferenceHandle } from "@/lib/workflows";
import { AiActionData, LLM, LLM_MODELS, getLLMLabel } from "@/lib/types";

export interface AiActionProps {
	data: AiActionData;
	updateData: (data: AiActionData) => void;
}

// TODO: prompt templates
export default function AiAction({ data, updateData }: AiActionProps) {
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
				<CopyText text={data.referenceHandle} />
			</Flex>

			<Flex direction="column" gap="2">
				<Text>Description</Text>
				<TextArea
					size="2"
					variant="surface"
					resize="vertical"
					value={data.actionDescription}
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
