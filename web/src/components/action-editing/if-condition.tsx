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
import { generateReferenceHandle } from "@/lib/workflows";

export interface IfConditionProps {
	data: IfConditionData;
	updateData: (data: IfConditionData) => void;
}

export default function IfCondition({ data, updateData }: IfConditionProps) {
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

									<TextField.Root
										variant="surface"
										value={condition.rhs}
										onChange={(event) => {
											const clonedData = cloneDeep(data);
											clonedData.actionDefinition.conditions[
												idx
											].rhs = event.target.value;
											updateData(clonedData);
										}}
										style={{ width: "100%" }}
									/>
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
