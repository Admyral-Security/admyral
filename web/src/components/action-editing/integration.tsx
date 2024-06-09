"use client";

import { Flex, Select, Text, TextArea, TextField } from "@radix-ui/themes";
import CopyText from "../copy-text";
import { generateReferenceHandle } from "@/lib/workflow-node";
import { cloneDeep } from "lodash";
import { IntegrationData } from "@/lib/types";
import { ApiParameterDatatype, IntegrationType } from "@/lib/integrations";
import useWorkflowStore from "@/lib/workflow-store";
import IntegrationLogoIconCard from "../integration-logo-icon-card";
import { INTEGRATIONS } from "@/lib/integrations";
import Link from "next/link";
import ArrowRightUpIcon from "../icons/arrow-right-up";
import { Suspense, useEffect } from "react";
import { REFERENCE_HANDLE_EXPLANATION } from "@/lib/constants";
import { errorToast } from "@/lib/toast";
import FloatInput from "../float-input";
import IntegerInput from "../integer-input";
import useListCredentials, {
	ListCredentialsProvider,
} from "@/providers/list-credentials-provider";

export interface IntegrationProps {
	id: string;
	saveWorkflowAndRedirect: (destintation: string) => void;
}

function IntegrationChild({ id, saveWorkflowAndRedirect }: IntegrationProps) {
	const { data, updateData } = useWorkflowStore((state) => ({
		data: state.nodes.find((node) => node.id === id)
			?.data as IntegrationData,
		updateData: (updatedData: IntegrationData) =>
			state.updateNodeData(id, updatedData),
	}));

	const { credentials, setIntegrationTypeFilter } = useListCredentials();

	const integrationType = (data as IntegrationData).actionDefinition
		.integrationType;
	const apiId = (data as IntegrationData).actionDefinition.api;
	const requiresAuthentication = INTEGRATIONS[integrationType!].apis.find(
		(api) => api.id === apiId,
	)?.requiresAuthentication;

	useEffect(() => {
		if (integrationType !== undefined) {
			setIntegrationTypeFilter(integrationType);
		}
	}, [integrationType]);

	useEffect(() => {
		if (!requiresAuthentication) {
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
	}, [id, credentials]);

	const integration =
		INTEGRATIONS[
			(data as IntegrationData).actionDefinition
				.integrationType as IntegrationType
		];
	const apiDefinition =
		integration.apis[
			integration.apis.findIndex(
				(api) =>
					api.id === (data as IntegrationData).actionDefinition.api,
			)
		];

	return (
		<Flex direction="column" gap="4" p="4">
			<Flex gap="4" align="center">
				<Flex>
					<IntegrationLogoIconCard integration={integrationType} />
				</Flex>

				<Flex direction="column">
					<Text weight="medium">
						{INTEGRATIONS[integrationType!].name}
					</Text>
					<Text color="gray" weight="light">
						{apiDefinition.name}
					</Text>
					{apiDefinition.documentationUrl && (
						<Link
							href={apiDefinition.documentationUrl}
							target="_blank"
							style={{
								color: "var(--Accent-color-Accent-9, #3E63DD)",
							}}
						>
							<Flex justify="start" align="center">
								<Text>Documentation</Text>
								<ArrowRightUpIcon />
							</Flex>
						</Link>
					)}
				</Flex>
			</Flex>

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
					style={{ height: "150px" }}
					onChange={(event) => {
						const clonedData = cloneDeep(data);
						clonedData.actionDescription = event.target.value;
						updateData(clonedData);
					}}
				/>
			</Flex>

			{apiDefinition.parameters.length > 0 && (
				<Text weight="medium">Inputs</Text>
			)}

			{/* TODO: code duplicate with src/components/action-editing/ai-action.tsx */}
			{requiresAuthentication && (
				<Flex direction="column" gap="2">
					<Text>Credential</Text>
					<Flex direction="column" gap="0">
						<Select.Root
							value={
								(data as IntegrationData).actionDefinition
									.credential
							}
							onValueChange={(credential) => {
								if (credential === "$$$save_and_redirect$$$") {
									saveWorkflowAndRedirect("/settings");
									return;
								}
								const clonedData = cloneDeep(data);
								(
									clonedData as IntegrationData
								).actionDefinition.credential = credential;
								updateData(clonedData);
							}}
						>
							<Select.Trigger placeholder="Select a credential" />
							<Select.Content variant="soft">
								{credentials !== null &&
									credentials.map((credential: string) => (
										<Select.Item
											key={credential}
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

			{apiDefinition.parameters.map((parameter) => (
				<Flex
					direction="column"
					gap="2"
					key={`${data.actionId}_${parameter.id}`}
					width="100%"
				>
					<Flex direction="column" gap="0">
						<Text>{parameter.displayName}</Text>
						<Text color="gray" weight="light" size="1">
							{parameter.description}
						</Text>
					</Flex>

					<Flex direction="column" gap="0" width="100%">
						{parameter.dataType ===
							ApiParameterDatatype.INTEGER && (
							<IntegerInput
								value={
									(data as IntegrationData).actionDefinition
										.params[parameter.id]
								}
								onValueChange={(value) => {
									const clonedData = cloneDeep(data);
									(
										clonedData as IntegrationData
									).actionDefinition.params[parameter.id] =
										value;
									updateData(clonedData);
								}}
							/>
						)}
						{parameter.dataType === ApiParameterDatatype.FLOAT && (
							<FloatInput
								value={
									(data as IntegrationData).actionDefinition
										.params[parameter.id]
								}
								onValueChange={(value) => {
									const clonedData = cloneDeep(data);
									(
										clonedData as IntegrationData
									).actionDefinition.params[parameter.id] =
										value;
									updateData(clonedData);
								}}
							/>
						)}
						{parameter.dataType === ApiParameterDatatype.TEXT && (
							<TextField.Root
								variant="surface"
								value={
									(data as IntegrationData).actionDefinition
										.params[parameter.id]
								}
								onChange={(event) => {
									const clonedData = cloneDeep(data);
									(
										clonedData as IntegrationData
									).actionDefinition.params[parameter.id] =
										event.target.value;
									updateData(clonedData);
								}}
							/>
						)}
						{parameter.dataType ===
							ApiParameterDatatype.TEXTAREA && (
							<Flex height="300px">
								<TextArea
									variant="surface"
									value={
										(data as IntegrationData)
											.actionDefinition.params[
											parameter.id
										]
									}
									onChange={(event) => {
										const clonedData = cloneDeep(data);
										(
											clonedData as IntegrationData
										).actionDefinition.params[
											parameter.id
										] = event.target.value;
										updateData(clonedData);
									}}
									style={{ width: "100%" }}
								/>
							</Flex>
						)}
						{parameter.dataType ===
							ApiParameterDatatype.BOOLEAN && (
							<Select.Root
								value={
									(data as IntegrationData).actionDefinition
										.params[parameter.id] === undefined
										? undefined
										: (
												data as IntegrationData
											).actionDefinition.params[
												parameter.id
											].toString()
								}
								onValueChange={(value) => {
									const clonedData = cloneDeep(data);
									(
										clonedData as IntegrationData
									).actionDefinition.params[parameter.id] =
										value === "true";
									updateData(clonedData);
								}}
							>
								<Select.Trigger placeholder="Select a value" />
								<Select.Content>
									<Select.Item value="true">true</Select.Item>
									<Select.Item value="false">
										false
									</Select.Item>
								</Select.Content>
							</Select.Root>
						)}
						<Flex justify="end">
							{parameter.required ? (
								<Text size="1">Required</Text>
							) : (
								<Text size="1">Optional</Text>
							)}
						</Flex>
					</Flex>
				</Flex>
			))}
		</Flex>
	);
}

export default function Integration(props: IntegrationProps) {
	return (
		<Suspense fallback={null}>
			<ListCredentialsProvider>
				<IntegrationChild {...props} />
			</ListCredentialsProvider>
		</Suspense>
	);
}
