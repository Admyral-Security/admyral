import { Flex, Text, TextArea, TextField } from "@radix-ui/themes";
import CopyText from "../copy-text";
import { generateReferenceHandle } from "@/lib/workflows";
import { cloneDeep } from "lodash";
import { WebhookData } from "@/lib/types";

export interface WebhookProps {
	data: WebhookData;
	updateData: (data: WebhookData) => void;
}

export default function Webhook({ data, updateData }: WebhookProps) {
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
				<Text>Webhook URL</Text>
				<CopyText
					text={`${process.env.NEXT_PUBLIC_WORKFLOW_RUNNER_API_URL}/webhooks/${data.webhookId}/${data.secret}`}
				/>
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
