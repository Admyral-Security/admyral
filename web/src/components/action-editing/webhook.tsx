import { Flex, Text, TextArea, TextField } from "@radix-ui/themes";
import CopyText from "../copy-text";

// TODO: based on action id, fetch webhook data
// TODO: autosave webhook data
// TODO: Input: action id and workflow id and a function for updating the action name state
export default function Webhook() {
	const data = {
		actionId: "sdaasdasddas",
		workflowId: "sddasdasdasd",
		actionName: "sddasdas",
		referenceHandle: "sddasdas",
		actionDescription: "this is an awesome action",
		actionDefinition: {},
		// webhook specifics
		webhookUrl:
			"https://webhook.site/8d2b4b0e-6d7e-4a3d-8e0e-3f2b4b0e6d7e/daskljfdkljskljsdf",
		webhookId: "8d2b4b0e-6d7e-4a3d-8e0e-3f2b4b0e6d7e",
		secret: "daskljfdkljskljsdf",
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
				<Text>Webhook URL</Text>
				<CopyText text={data.webhookUrl} />
			</Flex>

			<Flex direction="column" gap="2">
				<Text>Webhook Id</Text>
				<TextField.Root
					variant="surface"
					value={data.webhookId}
					disabled
				/>
			</Flex>

			<Flex direction="column" gap="2">
				<Text>Secret</Text>
				<TextField.Root
					variant="surface"
					value={data.secret}
					disabled
				/>
			</Flex>
		</Flex>
	);
}
