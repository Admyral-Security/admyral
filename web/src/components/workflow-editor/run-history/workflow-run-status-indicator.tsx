import { Spinner, Flex } from "@radix-ui/themes";
import { CheckCircledIcon, CrossCircledIcon } from "@radix-ui/react-icons";
import type { TWorkflowRunMetadata } from "@/types/workflow-runs";

export default function WorkflowRunStatusIndicator({
	workflowRun: { failedAt, completedAt },
}: {
	workflowRun: TWorkflowRunMetadata;
}) {
	if (failedAt === null && completedAt === null) {
		// In Progress
		return (
			<Flex align="center" gap="2">
				<Spinner size="1" />
			</Flex>
		);
	}

	if (completedAt === null) {
		// Failure
		return (
			<Flex align="center" gap="2">
				<CrossCircledIcon color="red" />
			</Flex>
		);
	}

	// Success
	return (
		<Flex align="center" gap="2">
			<CheckCircledIcon color="green" />
		</Flex>
	);
}
