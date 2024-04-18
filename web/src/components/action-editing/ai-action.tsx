import { Flex, Select, Text, TextArea, TextField } from "@radix-ui/themes";
import CopyText from "../copy-text";

// TODO: templates
// TODO: based on action id, fetch webhook data
// TODO: autosave webhook data
// TODO: Input: action id and workflow id and a function for updating the action name state
export default function AiAction() {
	const data = {
		actionId: "sdaasdasddas",
		workflowId: "sddasdasdasd",
		actionName: "my awesome api call",
		referenceHandle: "gfdkrgt",
		actionDescription: "this is an awesome api call",
		actionDefinition: {
			prompt: "Please classify the following text: ",
		},
	};

	return (
		<Flex direction="column" gap="4" p="4">
			<Flex direction="column" gap="2">
				<Text>Name</Text>
				<TextField.Root
					variant="surface"
					value={data.actionName}
					onChange={(event) => {
						// TODO:
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
						// TODO:
					}}
				/>
			</Flex>

			<Flex direction="column" gap="2">
				<Flex justify="between" align="center">
					<Text>Prompt</Text>

					<Select.Root
						value=""
						onValueChange={(template) => {
							// TODO: inject template into textfield
							console.log("Template: ", template);
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
					value={data.actionDefinition.prompt}
					style={{ height: "100px" }}
				/>
			</Flex>
		</Flex>
	);
}
