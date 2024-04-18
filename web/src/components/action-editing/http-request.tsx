import {
	Flex,
	IconButton,
	Select,
	Text,
	TextArea,
	TextField,
} from "@radix-ui/themes";
import CopyText from "../copy-text";
import { MinusIcon, PlusIcon } from "@radix-ui/react-icons";

// TODO: retries
// TODO: timeout
// TODO: based on action id, fetch webhook data
// TODO: autosave webhook data
// TODO: Input: action id and workflow id and a function for updating the action name state
export default function HttpRequest() {
	const data = {
		actionId: "sdaasdasddas",
		workflowId: "sddasdasdasd",
		actionName: "my awesome api call",
		referenceHandle: "gfdkrgt",
		actionDescription: "this is an awesome api call",
		actionDefinition: {
			method: "POST",
			url: "https://1ec498973e1abe4622fd3dc2a9ecd62d.m.pipedream.net",
			contentType: "application/json",
			headers: [
				{
					key: "Authorization",
					value: "Bearer <<CREDENTIAL.API_KEY>>",
				},
			],
			payload: {
				name: "John Doe",
				email: "test@test.de",
			},
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
				<Text>URL</Text>
				<TextField.Root
					variant="surface"
					value={data.actionDefinition.url}
				/>
			</Flex>

			<Flex direction="column" gap="2">
				<Text>Content Type</Text>
				<Select.Root value={data.actionDefinition.contentType || ""}>
					<Select.Trigger placeholder="None" />
					<Select.Content>
						<Select.Item value="application/json">JSON</Select.Item>
					</Select.Content>
				</Select.Root>
			</Flex>

			<Flex direction="column" gap="2">
				<Text>Method</Text>
				<Select.Root
					value={data.actionDefinition.method}
					defaultValue="GET"
				>
					<Select.Trigger />
					<Select.Content>
						<Select.Item value="GET">GET</Select.Item>
						<Select.Item value="POST">POST</Select.Item>
					</Select.Content>
				</Select.Root>
			</Flex>

			<Flex direction="column" gap="2">
				<Text>Headers</Text>

				<Flex direction="column" gap="4">
					{data.actionDefinition.headers.map((header, index) => (
						<Flex justify="between" gap="2">
							<Flex direction="column" gap="2" width="100%">
								<TextField.Root
									variant="surface"
									value={header.key}
									onChange={(event) => {
										// TODO:
									}}
									placeholder="Key"
									style={{
										width: "100%",
									}}
								/>

								<TextField.Root
									variant="surface"
									value={header.value}
									onChange={(event) => {
										// TODO:
									}}
									placeholder="Value"
									style={{
										width: "100%",
									}}
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
			</Flex>

			<Flex direction="column" gap="2">
				<Text>Body</Text>
				<TextArea
					size="2"
					resize="vertical"
					style={{ height: "200px" }}
				/>
			</Flex>
		</Flex>
	);
}
