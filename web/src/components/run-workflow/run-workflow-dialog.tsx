import { useTriggerWorkflowApi } from "@/hooks/use-trigger-workflow-api";
import { useToast } from "@/providers/toast";
import { useWorkflowStore } from "@/stores/workflow-store";
import { Cross1Icon } from "@radix-ui/react-icons";
import { Button, Dialog, Flex, Text } from "@radix-ui/themes";
import { useEffect } from "react";
import CodeEditor from "@/components/code-editor/code-editor";

export default function RunWorkflowDialog({
	closeDialog,
}: {
	closeDialog: () => void;
}) {
	const { workflowName, isActive, payloadCache, setPayloadCache } =
		useWorkflowStore();
	const triggerWorkflow = useTriggerWorkflowApi();
	const { errorToast, infoToast } = useToast();

	useEffect(() => {
		if (triggerWorkflow.isSuccess) {
			infoToast("Successfully triggered workflow");
			closeDialog();
		}
		if (triggerWorkflow.isError) {
			errorToast("Failed to trigger workflow. Please try again!");
		}
		if (triggerWorkflow.isSuccess || triggerWorkflow.isError) {
			triggerWorkflow.reset();
		}
	}, [triggerWorkflow, closeDialog]);

	const handleRunWorkflow = () => {
		if (!isActive) {
			errorToast("You must activate the workflow in order to run it.");
			return;
		}

		let parsedPayload = undefined;
		try {
			if (payloadCache === "") {
				parsedPayload = null;
			} else {
				parsedPayload = JSON.parse(payloadCache);
			}
		} catch (e) {
			errorToast("Failed to parse payload into JSON. Is it valid JSON?");
			return;
		}

		triggerWorkflow.mutate({ workflowName, payload: parsedPayload });
	};

	return (
		<Dialog.Content
			style={{
				maxWidth: "min(90vw, 900px)",
				height: "min(90vh, 612px)",
			}}
		>
			<Flex direction="column" gap="4" height="100%">
				<Flex justify="between" align="center">
					<Text weight="bold" size="5">
						Run Workflow
					</Text>

					<Dialog.Close>
						<Button
							size="2"
							variant="soft"
							color="gray"
							style={{
								cursor: "pointer",
								paddingLeft: 8,
								paddingRight: 8,
							}}
						>
							<Cross1Icon width="16" height="16" />
						</Button>
					</Dialog.Close>
				</Flex>

				<Flex direction="column" gap="2" height="100%">
					<Text weight="medium">Test Payload (JSON)</Text>
					<Flex width="100%" height="100%">
						<CodeEditor
							value={payloadCache}
							onChange={setPayloadCache}
							language="json"
						/>
					</Flex>
				</Flex>

				<Flex align="center" justify="end" gap="4">
					<Dialog.Close>
						<Button
							variant="soft"
							color="gray"
							style={{ cursor: "pointer" }}
						>
							Cancel
						</Button>
					</Dialog.Close>

					<Button
						variant="solid"
						size="2"
						style={{
							cursor: "pointer",
						}}
						onClick={handleRunWorkflow}
						loading={triggerWorkflow.isPending}
					>
						Run Workflow
					</Button>
				</Flex>
			</Flex>
		</Dialog.Content>
	);
}
