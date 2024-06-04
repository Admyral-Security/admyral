import { Flex, RadioGroup, Text, TextArea, TextField } from "@radix-ui/themes";
import CopyText from "../copy-text";
import { generateReferenceHandle } from "@/lib/workflow-node";
import { cloneDeep } from "lodash";
import { ActionNode, WebhookData } from "@/lib/types";
import useWorkflowStore from "@/lib/workflow-store";
import { REFERENCE_HANDLE_EXPLANATION } from "@/lib/constants";

export interface StartWorkflowProps {
	id: string;
}

export default function StartWorkflow({ id }: StartWorkflowProps) {
	const { data, updateData } = useWorkflowStore((state) => ({
		data: state.nodes.find((node) => node.id === id)?.data as WebhookData,
		updateData: (updatedData: WebhookData) =>
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
				<Text
					color="gray"
					weight="light"
					size="1"
					style={{ whiteSpace: "pre-line" }}
				>
					{REFERENCE_HANDLE_EXPLANATION}
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

			<Flex direction="column" gap="2" width="100%">
				<Text>Start Workflow Type</Text>
				<RadioGroup.Root
					value={data.actionType}
					onValueChange={(value: ActionNode) => {
						const clonedData = cloneDeep(data);
						clonedData.actionType = value;
						updateData(clonedData);
					}}
				>
					<RadioGroup.Item value={ActionNode.MANUAL_START}>
						<Flex direction="column">
							<Text>Manual Workflow Execution</Text>
							<Text weight="light">
								Trigger the workflow manually within Admyral
							</Text>
						</Flex>
					</RadioGroup.Item>
					<RadioGroup.Item value={ActionNode.WEBHOOK}>
						<Flex direction="column">
							<Text>Event-based Workflow Execution</Text>
							<Text weight="light">
								Trigger the workflow from other tools via an API
								call using the API URL
							</Text>
						</Flex>
					</RadioGroup.Item>
				</RadioGroup.Root>
			</Flex>

			{data.actionType === ActionNode.WEBHOOK && (
				<>
					<Flex direction="column" gap="2">
						<Text>API URL</Text>
						<CopyText
							text={`${process.env.NEXT_PUBLIC_WORKFLOW_RUNNER_API_URL}/webhook/${data.webhookId}/${data.secret}`}
						/>
					</Flex>

					<Flex direction="column" gap="2">
						<Text>API Id</Text>
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
				</>
			)}
		</Flex>
	);
}
