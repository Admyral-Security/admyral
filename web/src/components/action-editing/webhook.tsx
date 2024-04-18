import { Flex, Text, TextArea, TextField } from "@radix-ui/themes";
import CopyText from "../copy-text";
import { useEffect, useState } from "react";
import { generateReferenceHandle } from "@/lib/workflows";
import { cloneDeep } from "lodash";
import { WebhookData } from "@/lib/types";

export interface WebhookProps {
	actionId: string;
	updateNodeName: (name: string) => void;
}

export default function Webhook({ actionId, updateNodeName }: WebhookProps) {
	const [webhookData, setWebhookData] = useState<WebhookData>({
		actionId: "",
		workflowId: "",
		actionName: "",
		referenceHandle: "",
		actionDescription: "",
		webhookUrl: "",
		webhookId: "",
		secret: "",
	});

	useEffect(() => {
		// TODO: FETCH DATA
		setWebhookData({
			actionId: "sdaasdasddas",
			workflowId: "sddasdasdasd",
			actionName: "sddasdas",
			referenceHandle: "sddasdas",
			actionDescription: "this is an awesome action",
			webhookUrl:
				"https://webhook.site/8d2b4b0e-6d7e-4a3d-8e0e-3f2b4b0e6d7e/daskljfdkljskljsdf",
			webhookId: "8d2b4b0e-6d7e-4a3d-8e0e-3f2b4b0e6d7e",
			secret: "daskljfdkljskljsdf",
		});
	}, [actionId]);

	// TODO: Regularly save the data if it changed

	return (
		<Flex direction="column" gap="4" p="4">
			<Flex direction="column" gap="2">
				<Text>Name</Text>
				<TextField.Root
					variant="surface"
					value={webhookData.actionName}
					onChange={(event) => {
						// Update name in the state
						const clonedData = cloneDeep(webhookData);
						clonedData.actionName = event.target.value;
						clonedData.referenceHandle = generateReferenceHandle(
							event.target.value,
						);
						setWebhookData(clonedData);

						// Update name in the workflow node
						updateNodeName(event.target.value);
					}}
				/>
			</Flex>

			<Flex direction="column" gap="2">
				<Text>Reference Handle</Text>
				<CopyText text={webhookData.referenceHandle} />
			</Flex>

			<Flex direction="column" gap="2">
				<Text>Description</Text>
				<TextArea
					size="2"
					variant="surface"
					resize="vertical"
					value={webhookData.actionDescription}
					onChange={(event) => {
						const clonedData = cloneDeep(webhookData);
						clonedData.actionDescription = event.target.value;
						setWebhookData(clonedData);
					}}
				/>
			</Flex>

			<Flex direction="column" gap="2">
				<Text>Webhook URL</Text>
				<CopyText text={webhookData.webhookUrl} />
			</Flex>

			<Flex direction="column" gap="2">
				<Text>Webhook Id</Text>
				<TextField.Root
					variant="surface"
					value={webhookData.webhookId}
					disabled
				/>
			</Flex>

			<Flex direction="column" gap="2">
				<Text>Secret</Text>
				<TextField.Root
					variant="surface"
					value={webhookData.secret}
					disabled
				/>
			</Flex>
		</Flex>
	);
}
