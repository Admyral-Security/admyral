import { useWorkflowStore } from "@/stores/workflow-store";
import WorkflowEditorRightPanelBase from "../right-panel-base";
import { Code, Flex, Text, TextArea } from "@radix-ui/themes";
import IfConditionActionIcon from "@/components/icons/if-condition-action-icon";
import { TEditorWorkflowIfNode } from "@/types/react-flow";
import { produce } from "immer";

const exampleCode =
	'{{ result["message"] }} == "hello" or {{ result["count"] }} > 0';

export default function IfConditionEditPanel() {
	const { nodes, selectedNodeIdx, updateNodeData } = useWorkflowStore();

	if (!selectedNodeIdx) {
		return null;
	}

	const data = nodes[selectedNodeIdx].data as TEditorWorkflowIfNode;
	const condition = data.condition;

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

				<TextArea
					value={condition.toString()}
					placeholder="Your condition here..."
					resize="vertical"
					onChange={(event) =>
						updateNodeData(
							selectedNodeIdx,
							produce(data, (draft) => {
								draft.condition = event.target.value;
							}),
						)
					}
				/>
			</Flex>
		</WorkflowEditorRightPanelBase>
	);
}
