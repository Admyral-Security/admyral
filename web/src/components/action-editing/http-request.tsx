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
import { generateReferenceHandle } from "@/lib/workflow-node";
import { cloneDeep } from "lodash";
import { HttpRequestData } from "@/lib/types";
import useWorkflowStore from "@/lib/workflow-store";

export interface HttpRequestProps {
	id: string;
}

// TODO: retries
// TODO: timeout
export default function HttpRequest({ id }: HttpRequestProps) {
	const { data, updateData } = useWorkflowStore((state) => ({
		data: state.nodes.find((node) => node.id === id)
			?.data as HttpRequestData,
		updateData: (updatedData: HttpRequestData) =>
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

			<Flex direction="column" gap="2">
				<Text>URL</Text>
				<TextField.Root
					variant="surface"
					value={data.actionDefinition.url}
					onChange={(event) => {
						const clonedData = cloneDeep(data);
						clonedData.actionDefinition.url = event.target.value;
						updateData(clonedData);
					}}
				/>
			</Flex>

			<Flex direction="column" gap="2">
				<Text>Content Type</Text>
				<Select.Root
					value={data.actionDefinition.contentType}
					onValueChange={(contentType) => {
						const clonedData = cloneDeep(data);
						clonedData.actionDefinition.contentType = contentType;
						updateData(clonedData);
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
					value={data.actionDefinition.method}
					onValueChange={(method) => {
						const clonedData = cloneDeep(data);
						clonedData.actionDefinition.method = method;
						updateData(clonedData);
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
					{data.actionDefinition.headers.map((header, idx) => (
						<Flex
							key={`http_request_${idx}`}
							justify="between"
							gap="2"
						>
							<Flex direction="column" gap="2" width="100%">
								<TextField.Root
									variant="surface"
									value={header.key}
									onChange={(event) => {
										const clonedData = cloneDeep(data);
										clonedData.actionDefinition.headers[
											idx
										].key = event.target.value;
										updateData(clonedData);
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
										const clonedData = cloneDeep(data);
										clonedData.actionDefinition.headers[
											idx
										].value = event.target.value;
										updateData(clonedData);
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
										const clonedData = cloneDeep(data);
										clonedData.actionDefinition.headers.splice(
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
								clonedData.actionDefinition.headers.push({
									key: "",
									value: "",
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

			<Flex direction="column" gap="2">
				<Text>Body</Text>
				<TextArea
					size="2"
					resize="vertical"
					style={{ height: "200px" }}
					value={data.actionDefinition.payload}
					onChange={(event) => {
						const clonedData = cloneDeep(data);
						clonedData.actionDefinition.payload =
							event.target.value;
						updateData(clonedData);
					}}
				/>
			</Flex>
		</Flex>
	);
}
