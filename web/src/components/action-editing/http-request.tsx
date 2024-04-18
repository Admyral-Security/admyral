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
import { generateReferenceHandle } from "@/lib/workflows";
import { useEffect, useState } from "react";
import { cloneDeep } from "lodash";
import { HttpRequestData } from "@/lib/types";

export interface HttpRequestProps {
	actionId: string;
	updateNodeName: (name: string) => void;
}

// TODO: retries
// TODO: timeout
export default function HttpRequest({
	actionId,
	updateNodeName,
}: HttpRequestProps) {
	const [httpRequestData, setHttpRequestData] = useState<HttpRequestData>({
		actionId: "",
		workflowId: "",
		actionName: "",
		referenceHandle: "",
		actionDescription: "",
		actionDefinition: {
			method: "GET",
			url: "",
			contentType: "application/json",
			headers: [],
			payload: "",
		},
	});

	useEffect(() => {
		// TODO: FETCH DATA
		setHttpRequestData({
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
				payload: JSON.stringify({
					name: "John Doe",
					email: "test@test.de",
				}),
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
					value={httpRequestData.actionName}
					onChange={(event) => {
						// Update name in the state
						const clonedData = cloneDeep(httpRequestData);
						clonedData.actionName = event.target.value;
						clonedData.referenceHandle = generateReferenceHandle(
							event.target.value,
						);
						setHttpRequestData(clonedData);

						// Update name in the workflow node
						updateNodeName(event.target.value);
					}}
				/>
			</Flex>

			<Flex direction="column" gap="2">
				<Text>Reference Handle</Text>
				<CopyText text={httpRequestData.referenceHandle} />
			</Flex>

			<Flex direction="column" gap="2">
				<Text>Description</Text>
				<TextArea
					size="2"
					variant="surface"
					resize="vertical"
					value={httpRequestData.actionDescription}
					onChange={(event) => {
						const clonedData = cloneDeep(httpRequestData);
						clonedData.actionDescription = event.target.value;
						setHttpRequestData(clonedData);
					}}
				/>
			</Flex>

			<Flex direction="column" gap="2">
				<Text>URL</Text>
				<TextField.Root
					variant="surface"
					value={httpRequestData.actionDefinition.url}
					onChange={(event) => {
						const clonedData = cloneDeep(httpRequestData);
						clonedData.actionDefinition.url = event.target.value;
						setHttpRequestData(clonedData);
					}}
				/>
			</Flex>

			<Flex direction="column" gap="2">
				<Text>Content Type</Text>
				<Select.Root
					value={httpRequestData.actionDefinition.contentType}
					onValueChange={(contentType) => {
						const clonedData = cloneDeep(httpRequestData);
						clonedData.actionDefinition.contentType = contentType;
						setHttpRequestData(clonedData);
					}}
				>
					<Select.Trigger placeholder="None" />
					<Select.Content>
						<Select.Item value="application/json">JSON</Select.Item>
					</Select.Content>
				</Select.Root>
			</Flex>

			<Flex direction="column" gap="2">
				<Text>Method</Text>
				<Select.Root
					value={httpRequestData.actionDefinition.method}
					onValueChange={(method) => {
						const clonedData = cloneDeep(httpRequestData);
						clonedData.actionDefinition.method = method;
						setHttpRequestData(clonedData);
					}}
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
					{httpRequestData.actionDefinition.headers.map(
						(header, idx) => (
							<Flex justify="between" gap="2">
								<Flex direction="column" gap="2" width="100%">
									<TextField.Root
										variant="surface"
										value={header.key}
										onChange={(event) => {
											const clonedData =
												cloneDeep(httpRequestData);
											clonedData.actionDefinition.headers[
												idx
											].key = event.target.value;
											setHttpRequestData(clonedData);
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
											const clonedData =
												cloneDeep(httpRequestData);
											clonedData.actionDefinition.headers[
												idx
											].value = event.target.value;
											setHttpRequestData(clonedData);
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
											const clonedData =
												cloneDeep(httpRequestData);
											clonedData.actionDefinition.headers.splice(
												idx,
												1,
											);
											setHttpRequestData(clonedData);
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
								const clonedData = cloneDeep(httpRequestData);
								clonedData.actionDefinition.headers.push({
									key: "",
									value: "",
								});
								setHttpRequestData(clonedData);
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
					value={httpRequestData.actionDefinition.payload}
					onChange={(event) => {
						const clonedData = cloneDeep(httpRequestData);
						clonedData.actionDefinition.payload =
							event.target.value;
						setHttpRequestData(clonedData);
					}}
				/>
			</Flex>
		</Flex>
	);
}
