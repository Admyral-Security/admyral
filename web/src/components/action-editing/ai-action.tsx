import {
	Flex,
	Grid,
	Select,
	Text,
	TextArea,
	TextField,
} from "@radix-ui/themes";
import CopyText from "../copy-text";
import { cloneDeep } from "lodash";
import { generateReferenceHandle } from "@/lib/workflow-node";
import { AiActionData } from "@/lib/types";
import useWorkflowStore from "@/lib/workflow-store";
import { REFERENCE_HANDLE_EXPLANATION } from "@/lib/constants";
import { LLMS } from "@/lib/llm";
import IntegrationLogoIcon from "../integration-logo-icon";
import { Suspense, useEffect } from "react";
import useListCredentials, {
	ListCredentialsProvider,
} from "@/providers/list-credentials-provider";
import ArrowRightUpIcon from "../icons/arrow-right-up";
import { IntegrationType } from "@/lib/integrations";
import FloatInput from "../float-input";
import IntegerInput from "../integer-input";
import { errorToast } from "@/lib/toast";

const ADMYRAL = "ADMYRAL";

export interface AiActionProps {
	id: string;
	saveWorkflowAndRedirect: (destintation: string) => void;
}

// TODO: prompt templates
function AiActionChild({ id, saveWorkflowAndRedirect }: AiActionProps) {
	const { data, updateData } = useWorkflowStore((state) => ({
		data: state.nodes.find((node) => node.id === id)?.data as AiActionData,
		updateData: (updatedData: AiActionData) =>
			state.updateNodeData(id, updatedData),
	}));

	const { credentials, setIntegrationTypeFilter } = useListCredentials();

	useEffect(() => {
		if (data.actionDefinition.provider !== ADMYRAL) {
			setIntegrationTypeFilter(data.actionDefinition.provider);
		}
	}, []);

	useEffect(() => {
		if (data.actionDefinition.provider === ADMYRAL) {
			setIntegrationTypeFilter(null);
		} else {
			setIntegrationTypeFilter(data.actionDefinition.provider);
		}
	}, [data.actionDefinition.provider]);

	useEffect(() => {
		if (data.actionDefinition.provider === ADMYRAL) {
			return;
		}

		// Check if the selected credential is still available.
		// If not, reset it to undefined and notify the user.
		if (
			data.actionDefinition.credential !== undefined &&
			credentials !== null &&
			credentials.findIndex(
				(credential) => credential === data.actionDefinition.credential,
			) === -1
		) {
			errorToast(
				`The previously selected credential for ${data.actionName} does not exist anymore. Please select a new one.`,
			);
			const clonedData = cloneDeep(data);
			clonedData.actionDefinition.credential = undefined;
			updateData(clonedData);
		}
	}, [credentials]);

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

			<Flex direction="column" gap="2">
				<Text>Provider</Text>
				<Select.Root
					value={data.actionDefinition.provider}
					onValueChange={(provider) => {
						const clonedData = cloneDeep(data);
						clonedData.actionDefinition.provider = provider;
						clonedData.actionDefinition.model =
							LLMS[provider].models !== undefined &&
							LLMS[provider].models!.length > 0
								? LLMS[provider].models![0].id
								: undefined;
						if (provider === ADMYRAL) {
							clonedData.actionDefinition.maxTokens = undefined;
						}
						updateData(clonedData);
					}}
				>
					<Select.Trigger />
					<Select.Content variant="soft">
						{Object.keys(LLMS).map((provider) => (
							<Select.Item
								key={`ai_action_provider_${provider}`}
								value={provider}
							>
								<Grid
									columns="20px 1fr"
									gap="2"
									justify="center"
									align="center"
								>
									<IntegrationLogoIcon
										integration={provider}
									/>
									<Text>{LLMS[provider].name}</Text>
								</Grid>
							</Select.Item>
						))}
					</Select.Content>
				</Select.Root>
			</Flex>

			{data.actionDefinition.provider ===
				IntegrationType.AZURE_OPENAI && (
				<Flex direction="column" gap="2">
					<Text>Deployment Name</Text>

					<Flex direction="column" gap="0">
						<TextField.Root
							variant="surface"
							value={data.actionDefinition.model}
							onChange={(event) => {
								const clonedData = cloneDeep(data);
								clonedData.actionDefinition.model =
									event.target.value;
								updateData(clonedData);
							}}
						/>
						<Flex justify="end">
							<Text size="1">Required</Text>
						</Flex>
					</Flex>
				</Flex>
			)}

			{LLMS[data.actionDefinition.provider].models !== undefined && (
				<Flex direction="column" gap="2">
					<Text>Model</Text>
					<Select.Root
						value={data.actionDefinition.model}
						onValueChange={(model) => {
							const clonedData = cloneDeep(data);
							clonedData.actionDefinition.model = model;
							updateData(clonedData);
						}}
					>
						<Select.Trigger />
						<Select.Content variant="soft">
							{LLMS[data.actionDefinition.provider].models!.map(
								(model) => (
									<Select.Item
										key={`ai_action_model_${model.id}`}
										value={model.id}
									>
										{model.displayName}
									</Select.Item>
								),
							)}
						</Select.Content>
					</Select.Root>
				</Flex>
			)}

			{/* TODO: code duplicate with src/components/action-editing/integration.tsx */}
			{data.actionDefinition.provider !== ADMYRAL && (
				<Flex direction="column" gap="2">
					<Text>Credential</Text>
					<Flex direction="column" gap="0">
						<Select.Root
							value={data.actionDefinition.credential}
							onValueChange={(credential) => {
								if (credential === "$$$save_and_redirect$$$") {
									saveWorkflowAndRedirect("/settings");
									return;
								}
								const clonedData = cloneDeep(data);
								clonedData.actionDefinition.credential =
									credential;
								updateData(clonedData);
							}}
						>
							<Select.Trigger />
							<Select.Content variant="soft">
								{credentials !== null &&
									credentials.map((credential) => (
										<Select.Item
											key={`ai_action_credential_${credential}`}
											value={credential}
										>
											{credential}
										</Select.Item>
									))}
								{/* TODO: is there a better way to handle the onclick event than a reserved key/value? */}
								<Select.Item
									key="$$$save_and_redirect$$$"
									value="$$$save_and_redirect$$$"
								>
									<Flex justify="start" align="center">
										<Text>
											Save workflow and create new
											credentials
										</Text>
										<ArrowRightUpIcon fill="#1C2024" />
									</Flex>
								</Select.Item>
							</Select.Content>
						</Select.Root>

						<Flex justify="end">
							<Text size="1">Required</Text>
						</Flex>
					</Flex>
				</Flex>
			)}

			<Flex direction="column" gap="2">
				<Flex justify="between" align="center">
					<Text>Prompt</Text>

					<Select.Root
						value=""
						onValueChange={(template) => {
							// inject template into prompt field
							const clonedData = cloneDeep(data);
							clonedData.actionDefinition.prompt += template;
							updateData(clonedData);
						}}
					>
						<Select.Trigger placeholder="Templates" />
						<Select.Content>
							<Select.Item value="phishing">
								Phishing Classification
							</Select.Item>
						</Select.Content>
					</Select.Root>
				</Flex>
				<Flex direction="column" gap="0">
					<TextArea
						size="2"
						resize="vertical"
						variant="surface"
						value={data.actionDefinition.prompt}
						style={{ height: "250px" }}
						onChange={(event) => {
							const clonedData = cloneDeep(data);
							clonedData.actionDefinition.prompt =
								event.target.value;
							updateData(clonedData);
						}}
					/>

					<Flex justify="end">
						<Text size="1">Required</Text>
					</Flex>
				</Flex>
			</Flex>

			<Flex direction="column" gap="2">
				<Flex direction="column" gap="0">
					<Text>Top p</Text>
					<Text color="gray" weight="light" size="1">
						Value between 0 and 1. An alternative to sampling with
						temperature, called nucleus sampling, where the model
						considers the results of the tokens with Top P
						probability mass. So 0.1 means only the tokens
						comprising the top 10% probability mass are considered.
						We generally recommend altering this or temperature but
						not both.
					</Text>
				</Flex>

				<Flex direction="column" gap="0">
					<FloatInput
						value={data.actionDefinition.topP}
						onValueChange={(value) => {
							const clonedData = cloneDeep(data);
							clonedData.actionDefinition.topP = value;
							updateData(clonedData);
						}}
						min={0}
						max={1}
					/>
					<Flex justify="end">
						<Text size="1">Optional</Text>
					</Flex>
				</Flex>
			</Flex>

			<Flex direction="column" gap="2">
				<Flex direction="column" gap="0">
					<Text>Temperature</Text>
					<Text color="gray" weight="light" size="1">
						What sampling temperature to use, between 0 and 2.
						Higher values like 0.8 will make the output more random,
						while lower values like 0.2 will make it more focused
						and deterministic. We generally recommend altering this
						or Top P but not both.
					</Text>
				</Flex>

				<Flex direction="column" gap="0">
					<FloatInput
						value={data.actionDefinition.temperature}
						onValueChange={(value) => {
							const clonedData = cloneDeep(data);
							clonedData.actionDefinition.temperature = value;
							updateData(clonedData);
						}}
						min={0}
						max={2}
					/>
					<Flex justify="end">
						<Text size="1">Optional</Text>
					</Flex>
				</Flex>
			</Flex>

			{data.actionDefinition.provider !== ADMYRAL && (
				<Flex direction="column" gap="2">
					<Text>Max. Tokens</Text>

					<Flex direction="column" gap="0">
						<IntegerInput
							value={data.actionDefinition.maxTokens}
							onValueChange={(value) => {
								const clonedData = cloneDeep(data);
								clonedData.actionDefinition.maxTokens = value;
								updateData(clonedData);
							}}
						/>
						<Flex justify="end">
							<Text size="1">Optional</Text>
						</Flex>
					</Flex>
				</Flex>
			)}
		</Flex>
	);
}

export default function AiAction(props: AiActionProps) {
	return (
		<Suspense fallback={null}>
			<ListCredentialsProvider>
				<AiActionChild {...props} />
			</ListCredentialsProvider>
		</Suspense>
	);
}
