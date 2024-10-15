import { useWorkflowStore } from "@/stores/workflow-store";
import WorkflowEditorRightPanelBase from "../right-panel-base";
import { Code, Flex, Text } from "@radix-ui/themes";
import IfConditionActionIcon from "@/components/icons/if-condition-action-icon";
import { TEditorWorkflowIfNode } from "@/types/react-flow";
import { produce } from "immer";
import CodeEditorWithDialog from "@/components/code-editor-with-dialog/code-editor-with-dialog";

const exampleCode = 'result["message"] == "hello" or result["count"] > 0';

export default function IfConditionEditPanel() {
	const { nodes, selectedNodeIdx, updateNodeData } = useWorkflowStore();

	if (!selectedNodeIdx) {
		return null;
	}

	const data = nodes[selectedNodeIdx].data as TEditorWorkflowIfNode;
	const condition = data.condition;

	const handleConditionChange = (value: string) => {
		updateNodeData(
			selectedNodeIdx,
			produce(data, (draft) => {
				draft.condition = value;
			}),
		);
	};

	return (
		<WorkflowEditorRightPanelBase
			title={"If Condition"}
			titleIcon={<IfConditionActionIcon />}
		>
			<Flex direction="column" gap="4" p="4">
				<Flex
					direction="column"
					justify="start"
					align="start"
					width="100%"
					gap="2"
				>
					<Text color="gray" weight="light" size="2">
						Define your if-condition using Python syntax. You can
						use references inside your conditions.
					</Text>

					<Text weight="light" size="2">
						Example
					</Text>
					<Code weight="light" size="2">
						{exampleCode}
					</Code>
				</Flex>

				<Flex justify="start" align="center" width="100%" mt="5">
					<Code>IF</Code>
				</Flex>

				<Flex direction="column" gap="2" width="100%">
					<Flex justify="between" align="center">
						<Text size="2" color="gray">
							Condition
						</Text>
					</Flex>
					<Flex width="100%" height="128px">
						<CodeEditorWithDialog
							title="If Condition"
							value={condition}
							onChange={handleConditionChange}
							language="python"
						/>
					</Flex>
				</Flex>
			</Flex>
		</WorkflowEditorRightPanelBase>
	);
}
