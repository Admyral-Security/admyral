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
import { useEffect, useState } from "react";
import { cloneDeep } from "lodash";
import { generateReferenceHandle } from "@/lib/workflows";

export interface IfConditionProps {
	actionId: string;
	updateNodeName: (name: string) => void;
}

export default function IfCondition({
	actionId,
	updateNodeName,
}: IfConditionProps) {
	const [ifConditionData, setIfConditionData] = useState<IfConditionData>({
		actionId: "",
		workflowId: "",
		actionName: "",
		referenceHandle: "",
		actionDescription: "",
		actionDefinition: {
			conditions: [],
		},
	});

	useEffect(() => {
		// TODO: FETCH DATA
		setIfConditionData({
			actionId: "sddasdsaasdasddas",
			workflowId: "sddasdssddasdasd",
			actionName: "my amazing if condition",
			referenceHandle: "gfdkrgt",
			actionDescription: "this is my super cool if-condition",
			actionDefinition: {
				conditions: [
					{
						lhs: "<<some_node.value>>",
						operator: IfConditionOperator.EQUAL,
						rhs: "some value",
					},
					{
						lhs: "<<some_other_node.value>>",
						operator: IfConditionOperator.NOT_MATCH_REGEX,
						rhs: "some value 2",
					},
				],
			},
		});
	}, [actionId]);

	// TODO: Regularly save the data if it changed

	return (
		<Flex direction="column" gap="4" p="4">
			<Flex direction="column" gap="2">
				<Text>Name</Text>
				<TextField.Root
					variant="surface"
					value={ifConditionData.actionName}
					onChange={(event) => {
						// Update name in the state
						const clonedData = cloneDeep(ifConditionData);
						clonedData.actionName = event.target.value;
						clonedData.referenceHandle = generateReferenceHandle(
							event.target.value,
						);
						setIfConditionData(clonedData);

						// Update name in the workflow node
						updateNodeName(event.target.value);
					}}
				/>
			</Flex>

			<Flex direction="column" gap="2">
				<Text>Reference Handle</Text>
				<CopyText text={ifConditionData.referenceHandle} />
			</Flex>

			<Flex direction="column" gap="2">
				<Text>Description</Text>
				<TextArea
					size="2"
					variant="surface"
					resize="vertical"
					value={ifConditionData.actionDescription}
					onChange={(event) => {
						const clonedData = cloneDeep(ifConditionData);
						clonedData.actionDescription = event.target.value;
						setIfConditionData(clonedData);
					}}
				/>
			</Flex>

			<Flex direction="column" gap="4" mt="4">
				<Flex justify="start" align="center" width="100%">
					<Code>IF</Code>
				</Flex>

				{ifConditionData.actionDefinition.conditions.map(
					(condition, idx) => (
						<Flex direction="column" gap="2">
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
												const clonedData =
													cloneDeep(ifConditionData);
												clonedData.actionDefinition.conditions[
													idx
												].lhs = event.target.value;
												setIfConditionData(clonedData);
											}}
											style={{ width: "100%" }}
										/>

										<Flex width="60%" align="center">
											<Select.Root
												value={condition.operator}
												onValueChange={(operator) => {
													const clonedData =
														cloneDeep(
															ifConditionData,
														);
													clonedData.actionDefinition.conditions[
														idx
													].operator =
														operator as IfConditionOperator;
													setIfConditionData(
														clonedData,
													);
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
												const clonedData =
													cloneDeep(ifConditionData);
												clonedData.actionDefinition.conditions[
													idx
												].rhs = event.target.value;
												setIfConditionData(clonedData);
											}}
											style={{ width: "100%" }}
										/>
									</Flex>

									{idx + 1 <
										ifConditionData.actionDefinition
											.conditions.length && (
										<Box width="100%">
											<Flex
												justify="start"
												align="center"
											>
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
											const clonedData =
												cloneDeep(ifConditionData);
											clonedData.actionDefinition.conditions.splice(
												idx,
												1,
											);
											setIfConditionData(clonedData);
										}}
										style={{ cursor: "pointer" }}
									>
										<MinusIcon />
									</IconButton>
								</Flex>
							</Flex>
						</Flex>
					),
				)}

				<Flex justify="center" align="center">
					<IconButton
						size="1"
						radius="full"
						onClick={() => {
							const clonedData = cloneDeep(ifConditionData);
							clonedData.actionDefinition.conditions.push({
								lhs: "",
								operator: IfConditionOperator.EQUAL,
								rhs: "",
							});
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
