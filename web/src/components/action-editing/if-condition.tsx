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
	IfConditionOperator,
	getIfConditionOperatorLabel,
} from "@/lib/workflows";
import { MinusIcon, PlusIcon } from "@radix-ui/react-icons";

// TODO: based on action id, fetch webhook data
// TODO: autosave webhook data
// TODO: Input: action id and workflow id and a function for updating the action name state
export default function IfCondition() {
	const data = {
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
	};

	return (
		<Flex direction="column" gap="4" p="4">
			<Flex direction="column" gap="2">
				<Text>Name</Text>
				<TextField.Root
					variant="surface"
					value={data.actionName}
					onChange={(event) => {
						// TODO:
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
						// TODO:
					}}
				/>
			</Flex>

			<Flex direction="column" gap="4" mt="4">
				<Flex justify="start" align="center" width="100%">
					<Code>IF</Code>
				</Flex>

				{data.actionDefinition.conditions.map((condition, index) => (
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
											// TODO:
										}}
										style={{ width: "100%" }}
									/>

									<Flex width="60%" align="center">
										<Select.Root
											value={condition.operator}
											onValueChange={(operator) => {
												// TODO:
											}}
										>
											<Select.Trigger
												placeholder="Operator"
												style={{ width: "100%" }}
											/>
											<Select.Content>
												<Select.Item
													value={
														IfConditionOperator.EQUAL
													}
												>
													{getIfConditionOperatorLabel(
														IfConditionOperator.EQUAL,
													)}
												</Select.Item>
												<Select.Item
													value={
														IfConditionOperator.NOT_EQUAL
													}
												>
													{getIfConditionOperatorLabel(
														IfConditionOperator.NOT_EQUAL,
													)}
												</Select.Item>
												<Select.Item
													value={
														IfConditionOperator.GREATER_THAN
													}
												>
													{getIfConditionOperatorLabel(
														IfConditionOperator.GREATER_THAN,
													)}
												</Select.Item>
												<Select.Item
													value={
														IfConditionOperator.GREATER_THAN_OR_EQUAL
													}
												>
													{getIfConditionOperatorLabel(
														IfConditionOperator.GREATER_THAN_OR_EQUAL,
													)}
												</Select.Item>
												<Select.Item
													value={
														IfConditionOperator.LESS_THAN
													}
												>
													{getIfConditionOperatorLabel(
														IfConditionOperator.LESS_THAN,
													)}
												</Select.Item>
												<Select.Item
													value={
														IfConditionOperator.LESS_THAN_OR_EQUAL
													}
												>
													{getIfConditionOperatorLabel(
														IfConditionOperator.LESS_THAN_OR_EQUAL,
													)}
												</Select.Item>
												<Select.Item
													value={
														IfConditionOperator.MATCH_REGEX
													}
												>
													{getIfConditionOperatorLabel(
														IfConditionOperator.MATCH_REGEX,
													)}
												</Select.Item>
												<Select.Item
													value={
														IfConditionOperator.NOT_MATCH_REGEX
													}
												>
													{getIfConditionOperatorLabel(
														IfConditionOperator.NOT_MATCH_REGEX,
													)}
												</Select.Item>
											</Select.Content>
										</Select.Root>
									</Flex>

									<TextField.Root
										variant="surface"
										value={condition.rhs}
										onChange={(event) => {
											// TODO:
										}}
										style={{ width: "100%" }}
									/>
								</Flex>

								{index + 1 <
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
										// TODO:
										alert("Hello!");
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
							// TODO:
							alert("Hello!");
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
