import { Code, Flex, Text, TextField, Select } from "@radix-ui/themes";
import ActionIcon from "../action-icon";
import WorkflowEditorRightPanelBase from "../right-panel-base";
import { useWorkflowStore } from "@/stores/workflow-store";
import { useSecretsStore } from "@/stores/secrets-store";
import { useEditorActionStore } from "@/stores/editor-action-store";
import { TEditorWorkflowActionNode } from "@/types/react-flow";
import { produce } from "immer";
import { ChangeEvent, useEffect, useState } from "react";
import { useImmer } from "use-immer";
import { TActionMetadata } from "@/types/editor-actions";
import CodeEditorWithDialog from "@/components/code-editor-with-dialog/code-editor-with-dialog";
import useSaveWorkflow from "@/providers/save-workflow";
import { useRouter } from "next/navigation";
import { isValidResultName } from "@/lib/workflow-validation";

function buildInitialArgs(
	action: TEditorWorkflowActionNode,
	actionDefinition: TActionMetadata,
) {
	return actionDefinition.arguments.map((arg) => {
		const value =
			arg.argName in action.args
				? action.args[arg.argName]
				: JSON.stringify(arg.defaultValue) || "";
		return value === "null" ? "" : value;
	});
}

export default function ActionEditPanel() {
	const router = useRouter();
	const {
		nodes,
		selectedNodeIdx,
		updateNodeData,
		hasDeletedSecret,
		removeDeletedSecretByPlaceholder,
	} = useWorkflowStore();
	const { actionsIndex } = useEditorActionStore();
	const { secrets } = useSecretsStore();
	const { saveWorkflow } = useSaveWorkflow();
	const [validResultName, setValidResultName] = useState<boolean>(true);
	const [args, updateArgs] = useImmer<string[]>([]);

	useEffect(() => {
		if (selectedNodeIdx !== null) {
			const action = nodes[selectedNodeIdx];
			const actionData = action.data as TEditorWorkflowActionNode;
			const actionDefinition = actionsIndex[action.data.actionType];
			updateArgs(buildInitialArgs(actionData, actionDefinition));
		}
	}, [selectedNodeIdx, nodes, actionsIndex, updateArgs]);

	if (selectedNodeIdx === null) {
		return null;
	}

	const action = nodes[selectedNodeIdx];
	const actionData = action.data as TEditorWorkflowActionNode;
	const actionDefinition = actionsIndex[action.data.actionType];

	const onChangeResultName = (event: ChangeEvent<HTMLInputElement>) => {
		updateNodeData(
			selectedNodeIdx,
			produce(actionData, (draft) => {
				draft.resultName = event.target.value;
			}),
		);
	};

	const saveWorkflowAndRedirect = async () => {
		const saveSuccessful = await saveWorkflow();
		if (saveSuccessful) {
			router.push("/settings/secrets");
		}
	};

	const onChangeSecretsMapping = (
		secretPlaceholder: string,
		value: string,
	) => {
		if (value === "$$$save_and_redirect$$$") {
			saveWorkflowAndRedirect();
			return;
		}

		updateNodeData(
			selectedNodeIdx,
			produce(actionData, (draft) => {
				draft.secretsMapping[secretPlaceholder] = value;
			}),
		);

		removeDeletedSecretByPlaceholder(action.id, secretPlaceholder);
	};

	const onChangeActionArgument = (
		argument: string,
		argIdx: number,
		value: string,
	) => {
		updateArgs((draft) => {
			draft[argIdx] = value;
		});
		updateNodeData(
			selectedNodeIdx,
			produce(actionData, (draft) => {
				if (value === "") {
					delete draft.args[argument];
				} else {
					draft.args[argument] = value;
				}
			}),
		);
	};

	return (
		<WorkflowEditorRightPanelBase
			title={actionDefinition.displayName}
			titleIcon={<ActionIcon actionType={action.data.actionType} />}
		>
			<Flex direction="column" gap="4" p="4">
				<Flex direction="column" gap="2">
					<Text>Action Type</Text>
					<TextField.Root
						variant="surface"
						value={actionDefinition.actionType}
						disabled
					/>
				</Flex>

				{actionDefinition.description && (
					<Flex direction="column" gap="2">
						<Text color="gray" weight="light" size="2">
							{actionDefinition.description}
						</Text>
					</Flex>
				)}

				<Flex direction="column" gap="2">
					<Text>Result Name</Text>
					<TextField.Root
						variant="surface"
						value={actionData.resultName || ""}
						onChange={(event) => {
							onChangeResultName(event);
							setValidResultName(
								isValidResultName(event.target.value),
							);
						}}
					/>
					{!validResultName && (
						<Text color="red">
							Result names must be snake_case.
						</Text>
					)}
				</Flex>

				{actionDefinition.secretsPlaceholders.length > 0 && (
					<Flex direction="column" gap="2">
						<Text weight="medium" size="4">
							Secrets
						</Text>
						{actionDefinition.secretsPlaceholders.map(
							(secretPlaceholder) => (
								<Flex
									key={`${action.id}_secret_placeholder_${secretPlaceholder}`}
									direction="column"
									gap="1"
								>
									<Flex>
										<Code>{secretPlaceholder}</Code>
									</Flex>
									<Select.Root
										value={
											actionData.secretsMapping[
												secretPlaceholder
											]
										}
										onValueChange={(value) =>
											onChangeSecretsMapping(
												secretPlaceholder,
												value,
											)
										}
									>
										<Select.Trigger />
										<Select.Content>
											<Select.Group>
												<Select.Label>
													Select a secret
												</Select.Label>
												{secrets.map((_, idx) => (
													<Select.Item
														key={
															secrets[idx]
																.secretId
														}
														value={
															secrets[idx]
																.secretId
														}
													>
														{secrets[idx].secretId}
													</Select.Item>
												))}
												<Select.Separator />
												<Select.Item value="$$$save_and_redirect$$$">
													Save Workflow and Redirect
													to Secrets
												</Select.Item>
											</Select.Group>
										</Select.Content>
									</Select.Root>
									{hasDeletedSecret(
										action.id,
										secretPlaceholder,
									) && (
										<Flex
											mt="2"
											direction="row"
											align="center"
										>
											<Text color="red" weight="medium">
												The previously selected secret
												could not be found.
											</Text>
										</Flex>
									)}
								</Flex>
							),
						)}
					</Flex>
				)}

				{actionDefinition.arguments.length > 0 && (
					<Flex direction="column" gap="2" width="100%">
						<Text weight="medium" size="4">
							Action Arguments
						</Text>
						{actionDefinition.arguments.map((argument, argIdx) => (
							<Flex
								key={`${action.id}_action_edit_${argument.argName}`}
								direction="column"
								gap="1"
								width="100%"
							>
								<Text>{argument.displayName}</Text>
								<Text color="gray" weight="light" size="1">
									{argument.description}
								</Text>
								<Text color="gray" weight="light" size="1">
									Type: {argument.argType}
								</Text>
								<Flex width="100%" height="128px">
									<CodeEditorWithDialog
										title={argument.displayName}
										description={argument.description}
										value={args[argIdx]}
										onChange={(value) =>
											onChangeActionArgument(
												argument.argName,
												argIdx,
												value,
											)
										}
									/>
								</Flex>
								<Flex justify="end">
									<Text color="gray" weight="light" size="1">
										{argument.isOptional
											? "Optional"
											: "Required"}
									</Text>
								</Flex>
							</Flex>
						))}
					</Flex>
				)}
			</Flex>
		</WorkflowEditorRightPanelBase>
	);
}
