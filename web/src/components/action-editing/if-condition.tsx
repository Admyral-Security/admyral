import {
	Box,
	Code,
	Flex,
	IconButton,
	Select,
	Text,
	TextArea,
	TextField,
} from "@radix-ui/themes";
import CopyText from "../copy-text";
import {
	IF_CONDITION_OPERATORS,
	IfConditionData,
	IfConditionOperator,
	getIfConditionOperatorLabel,
} from "@/lib/types";
import { MinusIcon, PlusIcon } from "@radix-ui/react-icons";
import { cloneDeep } from "lodash";
import { generateReferenceHandle } from "@/lib/workflow-node";
import useWorkflowStore from "@/lib/workflow-store";
import { REFERENCE_HANDLE_EXPLANATION } from "@/lib/constants";

function isUnaryOperator(operator: IfConditionOperator) {
	return (
		operator === IfConditionOperator.IS_EMPTY ||
		operator === IfConditionOperator.IS_NOT_EMPTY ||
		operator === IfConditionOperator.EXISTS ||
		operator === IfConditionOperator.DOES_NOT_EXIST
	);
}

export interface IfConditionProps {
	id: string;
}

export default function IfCondition({ id }: IfConditionProps) {
	const { data, updateData } = useWorkflowStore((state) => ({
		data: state.nodes.find((node) => node.id === id)
			?.data as IfConditionData,
		updateData: (updatedData: IfConditionData) =>
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

			<Flex direction="column" gap="4" mt="4">
				<Flex justify="start" align="center" width="100%">
					<Code>IF</Code>
				</Flex>

				{data.actionDefinition.conditions.map((condition, idx) => (
					<Flex key={`if_cond_${idx}`} direction="column" gap="2">
						<Flex justify="between" gap="2">
							<Flex gap="4" direction="column" width="100%">
								<Flex
									gap="2"
									direction="column"
									align="center"
									width="100%"
								>
									<TextField.Root
										variant="surface"
										value={condition.lhs}
										onChange={(event) => {
											const clonedData = cloneDeep(data);
											clonedData.actionDefinition.conditions[
												idx
											].lhs = event.target.value;
											updateData(clonedData);
										}}
										style={{ width: "100%" }}
									/>

									<Flex width="70%" align="center">
										<Select.Root
											value={condition.operator}
											onValueChange={(operator) => {
												const clonedData =
													cloneDeep(data);
												clonedData.actionDefinition.conditions[
													idx
												].operator =
													operator as IfConditionOperator;
												updateData(clonedData);
											}}
										>
											<Select.Trigger
												placeholder="Operator"
												style={{ width: "100%" }}
											/>
											<Select.Content>
												{IF_CONDITION_OPERATORS.map(
													(operator) => (
														<Select.Item
															key={`if_condition_operators_${operator}`}
															value={operator}
														>
															{getIfConditionOperatorLabel(
																operator,
															)}
														</Select.Item>
													),
												)}
											</Select.Content>
										</Select.Root>
									</Flex>

									{!isUnaryOperator(condition.operator) && (
										<TextField.Root
											variant="surface"
											value={condition.rhs}
											onChange={(event) => {
												const clonedData =
													cloneDeep(data);
												clonedData.actionDefinition.conditions[
													idx
												].rhs = event.target.value;
												updateData(clonedData);
											}}
											style={{ width: "100%" }}
										/>
									)}
								</Flex>

								{idx + 1 <
									data.actionDefinition.conditions.length && (
									<Box width="100%">
										<Flex justify="start" align="center">
											<Code>AND</Code>
										</Flex>
									</Box>
								)}
							</Flex>

							<Flex justify="end">
								<IconButton
									size="1"
									radius="full"
									onClick={() => {
										const clonedData = cloneDeep(data);
										clonedData.actionDefinition.conditions.splice(
											idx,
											1,
										);
										updateData(clonedData);
									}}
									style={{ cursor: "pointer" }}
								>
									<MinusIcon />
								</IconButton>
							</Flex>
						</Flex>
					</Flex>
				))}

				<Flex justify="center" align="center">
					<IconButton
						size="1"
						radius="full"
						onClick={() => {
							const clonedData = cloneDeep(data);
							clonedData.actionDefinition.conditions.push({
								lhs: "",
								operator: IfConditionOperator.EQUALS,
								rhs: "",
							});
							updateData(clonedData);
						}}
						style={{ cursor: "pointer" }}
					>
						<PlusIcon />
					</IconButton>
				</Flex>
			</Flex>
		</Flex>
	);
}
