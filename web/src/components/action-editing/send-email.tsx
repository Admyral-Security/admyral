import { Flex, IconButton, Text, TextArea, TextField } from "@radix-ui/themes";
import CopyText from "../copy-text";
import { MinusIcon, PlusIcon } from "@radix-ui/react-icons";
import { useEffect, useState } from "react";
import { SendEmailData } from "@/lib/types";
import { generateReferenceHandle } from "@/lib/workflows";
import { cloneDeep } from "lodash";

export interface SendEmailProps {
	actionId: string;
	updateNodeName: (name: string) => void;
}

// TODO: recipients => email validation
// TODO: "reply to" field
export default function SendEmail({
	actionId,
	updateNodeName,
}: SendEmailProps) {
	const [sendEmailData, setSendEmailData] = useState<SendEmailData>({
		actionId: "",
		workflowId: "",
		actionName: "",
		referenceHandle: "",
		actionDescription: "",
		actionDefinition: {
			recipients: [],
			subject: "",
			body: "",
			senderName: "",
		},
	});

	useEffect(() => {
		// TODO: FETCH DATA
		setSendEmailData({
			actionId: "dfgdfgdfgdfg",
			workflowId: "sddasdssddasdasd",
			actionName: "sending an amazing email",
			referenceHandle: "sending_an_amazing_email",
			actionDescription: "this is my super cool send email action",
			actionDefinition: {
				recipients: ["test@admyral.com", "test2@admyral.com"],
				subject: "",
				body: "",
				senderName: "Admyral",
			},
		});
	}, [actionId]);

	// TODO: autosave the data if it changed

	return (
		<Flex direction="column" gap="4" p="4">
			<Flex direction="column" gap="2">
				<Text>Name</Text>
				<TextField.Root
					variant="surface"
					value={sendEmailData.actionName}
					onChange={(event) => {
						// Update name in the state
						const clonedData = cloneDeep(sendEmailData);
						clonedData.actionName = event.target.value;
						clonedData.referenceHandle = generateReferenceHandle(
							event.target.value,
						);
						setSendEmailData(clonedData);

						// Update name in the workflow node
						updateNodeName(event.target.value);
					}}
				/>
			</Flex>

			<Flex direction="column" gap="2">
				<Text>Reference Handle</Text>
				<CopyText text={sendEmailData.referenceHandle} />
			</Flex>

			<Flex direction="column" gap="2">
				<Text>Description</Text>
				<TextArea
					size="2"
					variant="surface"
					resize="vertical"
					value={sendEmailData.actionDescription}
					onChange={(event) => {
						const clonedData = cloneDeep(sendEmailData);
						clonedData.actionDescription = event.target.value;
						setSendEmailData(clonedData);
					}}
				/>
			</Flex>

			<Flex direction="column" gap="2">
				<Text>Recipients</Text>

				{sendEmailData.actionDefinition.recipients.map(
					(recipient, idx) => (
						<Flex justify="between" gap="2">
							<Flex width="100%">
								<TextField.Root
									type="email"
									variant="surface"
									value={recipient}
									onChange={(event) => {
										const clonedData =
											cloneDeep(sendEmailData);
										clonedData.actionDefinition.recipients[
											idx
										] = event.target.value;
										setSendEmailData(clonedData);
									}}
									style={{ width: "100%" }}
								/>
							</Flex>
							<Flex justify="end">
								<IconButton
									size="1"
									radius="full"
									onClick={() => {
										const clonedData =
											cloneDeep(sendEmailData);
										clonedData.actionDefinition.recipients.splice(
											idx,
											1,
										);
										setSendEmailData(clonedData);
									}}
									style={{ cursor: "pointer" }}
								>
									<MinusIcon />
								</IconButton>
							</Flex>
						</Flex>
					),
				)}

				<Flex justify="center" align="center">
					<IconButton
						size="1"
						radius="full"
						onClick={() => {
							const clonedData = cloneDeep(sendEmailData);
							clonedData.actionDefinition.recipients.push("");
							setSendEmailData(clonedData);
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
					value={sendEmailData.actionDefinition.senderName}
					onChange={(event) => {
						const clonedData = cloneDeep(sendEmailData);
						clonedData.actionDefinition.senderName =
							event.target.value;
						setSendEmailData(clonedData);
					}}
				/>
			</Flex>

			<Flex direction="column" gap="2">
				<Text>Subject</Text>
				<TextField.Root
					variant="surface"
					value={sendEmailData.actionDefinition.subject}
					onChange={(event) => {
						const clonedData = cloneDeep(sendEmailData);
						clonedData.actionDefinition.subject =
							event.target.value;
						setSendEmailData(clonedData);
					}}
				/>
			</Flex>

			<Flex direction="column" gap="2">
				<Text>Body</Text>
				<TextArea
					variant="surface"
					value={sendEmailData.actionDefinition.body}
					onChange={(event) => {
						const clonedData = cloneDeep(sendEmailData);
						clonedData.actionDefinition.body = event.target.value;
						setSendEmailData(clonedData);
					}}
					style={{ height: "250px" }}
				/>
			</Flex>
		</Flex>
	);
}
