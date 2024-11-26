"use client";

import { Code, Flex, RadioCards, Text, TextField } from "@radix-ui/themes";
import WorkflowEditorRightPanelBase from "../right-panel-base";
import ActionIcon from "../action-icon";
import { LoopType, TEditorWorkflowLoopNode } from "@/types/react-flow";
import { useWorkflowStore } from "@/stores/workflow-store";
import { ListBulletIcon, PlusIcon } from "@radix-ui/react-icons";
import { ChangeEvent, useState } from "react";
import { produce } from "immer";
import CodeEditorWithDialog from "@/components/code-editor-with-dialog/code-editor-with-dialog";
import { isValidResultName } from "@/lib/workflow-validation";

export default function LoopEditPanel() {
	const { nodes, selectedNodeIdx, updateNodeData } = useWorkflowStore();
	const [validLoopName, setValidLoopName] = useState<boolean>(true);

	if (!selectedNodeIdx) {
		return null;
	}

	const onChangeLoopType = (value: string) => {
		updateNodeData(
			selectedNodeIdx,
			produce(data, (draft) => {
				draft.loopType = value as LoopType;
			}),
		);
	};

	const onChangeLoopName = (event: ChangeEvent<HTMLInputElement>) => {
		updateNodeData(
			selectedNodeIdx,
			produce(data, (draft) => {
				draft.loopName = event.target.value;
			}),
		);
		setValidLoopName(isValidResultName(event.target.value));
	};

	const onChangeLoopCondition = (value: string) => {
		updateNodeData(
			selectedNodeIdx,
			produce(data, (draft) => {
				draft.loopCondition = value;
			}),
		);
	};

	const onChangeResultsToCollect = (value: string) => {
		updateNodeData(
			selectedNodeIdx,
			produce(data, (draft) => {
				draft.resultsToCollect = value;
			}),
		);
	};

	const data = nodes[selectedNodeIdx].data as TEditorWorkflowLoopNode;
	let title;
	if (data.loopType === LoopType.CONDITION) {
		title = "Condition";
	} else if (data.loopType === LoopType.COUNT) {
		title = "Number of Iterations";
	} else {
		title = "List Reference";
	}

	return (
		<WorkflowEditorRightPanelBase
			title={"Loop"}
			titleIcon={<ActionIcon actionType="loop" />}
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
						Loop actions allow you to iterate over lists, count up
						to a number, or repeat while a condition is true. Each
						iteration can access the current loop value through
						references. To reference the current loop value, use the{" "}
						<Code>my_loop_value</Code> reference, i.e., the name of
						your loop with <Code>_value</Code> as a suffix.
					</Text>
				</Flex>

				<Flex direction="column" gap="2">
					<Text>Loop Name</Text>
					<TextField.Root
						variant="surface"
						value={data.loopName}
						onChange={onChangeLoopName}
					/>
					{!validLoopName && (
						<Text color="red">Loop names must be snake_case.</Text>
					)}
				</Flex>

				<Flex direction="column" gap="2" width="100%">
					<Text>Loop Type</Text>
					<RadioCards.Root
						columns={{ initial: "2" }}
						value={data.loopType}
						onValueChange={onChangeLoopType}
					>
						<RadioCards.Item
							value={LoopType.LIST}
							style={{ cursor: "pointer" }}
						>
							<Flex
								direction="column"
								justify="center"
								align="center"
							>
								<ListBulletIcon height="24" width="24" />
								<Text size="3" weight="regular">
									List
								</Text>
							</Flex>
						</RadioCards.Item>

						<RadioCards.Item
							value={LoopType.COUNT}
							style={{ cursor: "pointer" }}
						>
							<Flex
								direction="column"
								justify="center"
								align="center"
							>
								<PlusIcon height="24" width="24" />
								<Text size="3" weight="regular">
									Count
								</Text>
							</Flex>
						</RadioCards.Item>
					</RadioCards.Root>
				</Flex>

				<Flex direction="column" gap="2">
					<Text>{title}</Text>
					<Flex width="100%" height="86px">
						<CodeEditorWithDialog
							title={title}
							value={data.loopCondition.toString()}
							onChange={onChangeLoopCondition}
						/>
					</Flex>
				</Flex>

				<Flex direction="column" gap="2">
					<Text>Results to Collect</Text>
					<Text size="2" color="gray" weight="light">
						Enter the names of the results you want to collect from
						each iteration of the loop. Separate multiple names with
						a comma. Leave blank to collect all results.
					</Text>
					<Flex width="100%" height="86px">
						<CodeEditorWithDialog
							title="Results to Collect"
							value={data.resultsToCollect}
							onChange={onChangeResultsToCollect}
						/>
					</Flex>
				</Flex>
			</Flex>
		</WorkflowEditorRightPanelBase>
	);
}
