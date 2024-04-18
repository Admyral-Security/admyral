import { Flex, IconButton, Text, TextArea, TextField } from "@radix-ui/themes";
import CopyText from "../copy-text";
import { MinusIcon, PlusIcon } from "@radix-ui/react-icons";

// TODO: "reply to" field
// TODO: based on action id, fetch webhook data
// TODO: autosave webhook data
// TODO: Input: action id and workflow id and a function for updating the action name state
export default function SendEmail() {
	const data = {
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

			<Flex direction="column" gap="2">
				<Text>Recipients</Text>

				{data.actionDefinition.recipients.map((recipient, index) => (
					<Flex justify="between" gap="2">
						<Flex width="100%">
							<TextField.Root
								type="email"
								variant="surface"
								value={recipient}
								onChange={(event) => {
									// TODO: check for valid email!
									// TODO:
								}}
								style={{ width: "100%" }}
							/>
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

			<Flex direction="column" gap="2">
				<Text>Sender Name</Text>
				<TextField.Root
					variant="surface"
					value={data.actionDefinition.senderName}
					onChange={(event) => {
						// TODO:
					}}
				/>
			</Flex>

			<Flex direction="column" gap="2">
				<Text>Subject</Text>
				<TextField.Root
					variant="surface"
					value={data.actionDefinition.subject}
					onChange={(event) => {
						// TODO:
					}}
				/>
			</Flex>

			<Flex direction="column" gap="2">
				<Text>Body</Text>
				<TextArea
					variant="surface"
					value={data.actionDefinition.body}
					onChange={(event) => {
						// TODO:
					}}
					style={{ height: "250px" }}
				/>
			</Flex>
		</Flex>
	);
}
