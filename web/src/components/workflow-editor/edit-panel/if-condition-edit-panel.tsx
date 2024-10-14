import { useState } from "react";
import { useWorkflowStore } from "@/stores/workflow-store";
import WorkflowEditorRightPanelBase from "../right-panel-base";
import { Code, Flex, Text, Dialog, IconButton } from "@radix-ui/themes";
import IfConditionActionIcon from "@/components/icons/if-condition-action-icon";
import { TEditorWorkflowIfNode } from "@/types/react-flow";
import { produce } from "immer";
import { CustomEditor } from "@/components/editor/editor";
import { SizeIcon } from "@radix-ui/react-icons";

const exampleCode = 'result["message"] == "hello" or result["count"] > 0';

export default function IfConditionEditPanel() {
	const { nodes, selectedNodeIdx, updateNodeData } = useWorkflowStore();
	const [enlargedEditorOpen, setEnlargedEditorOpen] = useState(false);

	if (!selectedNodeIdx) {
		return null;
	}

	const data = nodes[selectedNodeIdx].data as TEditorWorkflowIfNode;
	const condition = data.condition;

	const handleConditionChange = (value: string | undefined) => {
		updateNodeData(
			selectedNodeIdx,
			produce(data, (draft) => {
				draft.condition = value || "";
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
						<IconButton
							variant="ghost"
							size="1"
							onClick={() => setEnlargedEditorOpen(true)}
						>
							<SizeIcon />
						</IconButton>
					</Flex>
					<CustomEditor
						value={condition.toString()}
						onChange={handleConditionChange}
						language="python"
						className="h-24 w-full"
					/>
				</Flex>
				<Dialog.Root
					open={enlargedEditorOpen}
					onOpenChange={setEnlargedEditorOpen}
				>
					<Dialog.Content
						style={{ maxWidth: "min(90vw, 800px)", width: "100%" }}
					>
						<Flex justify="between" align="center" mb="4">
							<Dialog.Title>Edit Condition</Dialog.Title>
							<Dialog.Close>
								<IconButton variant="ghost" size="1">
									<SizeIcon />
								</IconButton>
							</Dialog.Close>
						</Flex>
						<CustomEditor
							value={condition.toString()}
							onChange={handleConditionChange}
							language="python"
							className="h-[30vh] w-full"
						/>
					</Dialog.Content>
				</Dialog.Root>
			</Flex>
		</WorkflowEditorRightPanelBase>
	);
}
