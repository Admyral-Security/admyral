import { Flex, IconButton, Text, TextArea, TextField } from "@radix-ui/themes";
import CopyText from "../copy-text";
import { MinusIcon, PlusIcon } from "@radix-ui/react-icons";
import { SendEmailData } from "@/lib/types";
import { generateReferenceHandle } from "@/lib/workflows";
import { cloneDeep } from "lodash";

export interface SendEmailProps {
	data: SendEmailData;
	updateData: (data: SendEmailData) => void;
}

// TODO: recipients => email validation
// TODO: "reply to" field
export default function SendEmail({ data, updateData }: SendEmailProps) {
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

			<Flex direction="column" gap="2">
				<Text>Recipients</Text>

				{data.actionDefinition.recipients.map((recipient, idx) => (
					<Flex justify="between" gap="2">
						<Flex width="100%">
							<TextField.Root
								type="email"
								variant="surface"
								value={recipient}
								onChange={(event) => {
									const clonedData = cloneDeep(data);
									clonedData.actionDefinition.recipients[
										idx
									] = event.target.value;
									updateData(clonedData);
								}}
								style={{ width: "100%" }}
							/>
						</Flex>
						<Flex justify="end">
							<IconButton
								size="1"
								radius="full"
								onClick={() => {
									const clonedData = cloneDeep(data);
									clonedData.actionDefinition.recipients.splice(
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
				))}

				<Flex justify="center" align="center">
					<IconButton
						size="1"
						radius="full"
						onClick={() => {
							const clonedData = cloneDeep(data);
							clonedData.actionDefinition.recipients.push("");
							updateData(clonedData);
						}}
						style={{ cursor: "pointer" }}
					>
						<PlusIcon />
					</IconButton>
				</Flex>
			</Flex>

			<Flex direction="column" gap="2">
				<Text>Sender Name</Text>
				<TextField.Root
					variant="surface"
					value={data.actionDefinition.senderName}
					onChange={(event) => {
						const clonedData = cloneDeep(data);
						clonedData.actionDefinition.senderName =
							event.target.value;
						updateData(clonedData);
					}}
				/>
			</Flex>

			<Flex direction="column" gap="2">
				<Text>Subject</Text>
				<TextField.Root
					variant="surface"
					value={data.actionDefinition.subject}
					onChange={(event) => {
						const clonedData = cloneDeep(data);
						clonedData.actionDefinition.subject =
							event.target.value;
						updateData(clonedData);
					}}
				/>
			</Flex>

			<Flex direction="column" gap="2">
				<Text>Body</Text>
				<TextArea
					variant="surface"
					value={data.actionDefinition.body}
					onChange={(event) => {
						const clonedData = cloneDeep(data);
						clonedData.actionDefinition.body = event.target.value;
						updateData(clonedData);
					}}
					style={{ height: "250px" }}
				/>
			</Flex>
		</Flex>
	);
}
