"use client";

import { Flex, Select, Text, TextArea, TextField } from "@radix-ui/themes";
import CopyText from "../copy-text";
import { generateReferenceHandle } from "@/lib/workflow-node";
import { cloneDeep } from "lodash";
import { Credential, IntegrationData } from "@/lib/types";
import { ApiParameterDatatype, IntegrationType } from "@/lib/integrations";
import useWorkflowStore from "@/lib/workflow-store";
import IntegrationLogoIconCard from "../integration-logo-icon-card";
import { INTEGRATIONS } from "@/lib/integrations";
import Link from "next/link";
import ArrowRightUpIcon from "../icons/arrow-right-up";
import { useEffect, useState } from "react";
import { listCredentials } from "@/lib/api";

export interface IntegrationProps {
	id: string;
}

export default function Integration({ id }: IntegrationProps) {
	const { data, updateData } = useWorkflowStore((state) => ({
		data: state.nodes.find((node) => node.id === id)
			?.data as IntegrationData,
		updateData: (updatedData: IntegrationData) =>
			state.updateNodeData(id, updatedData),
	}));
	const [availableCredentials, setAvailableCredentials] = useState<string[]>(
		[],
	);

	const integrationType = (data as IntegrationData).actionDefinition
		.integrationType;
	const apiId = (data as IntegrationData).actionDefinition.api;
	const requiresAuthentication = INTEGRATIONS[integrationType!].apis.find(
		(api) => api.id === apiId,
	)?.requiresAuthentication;

	useEffect(() => {
		if (!requiresAuthentication) {
			return;
		}

		// if the credential is already selected, then we already know that it exists
		// and we add it directly to the available credentials so that it is immediately
		// shown in the UI
		const previouslySelectedCredential = (data as IntegrationData)
			.actionDefinition.credential;
		setAvailableCredentials(
			previouslySelectedCredential ? [previouslySelectedCredential] : [],
		);

		listCredentials(
			(data as IntegrationData).actionDefinition.integrationType,
		)
			.then((credentials: Credential[]) => {
				if (
					(data as IntegrationData).actionDefinition.credential &&
					!credentials.find(
						(c) =>
							c.name ===
							(data as IntegrationData).actionDefinition
								.credential,
					)
				) {
					// The credential does not exist anymore! Hence, we reset the selected the credential
					const clonedData = cloneDeep(data);
					(
						clonedData as IntegrationData
					).actionDefinition.credential = "";
					updateData(clonedData);
					// Note: the following alert is shown twice in development mode due to react strictmode which renders every component twice
					alert(
						`The previously selected credential for ${data.actionName} does not exist anymore. Please select a new one.`,
					);
				}

				setAvailableCredentials(
					credentials.map(
						(credential: Credential) => credential.name,
					),
				);
			})
			.catch((error) => {
				alert(
					"Failed to fetch available credentials. Please unselect and select the integration node again.",
				);
			});
	}, [id]);

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
								const clonedData = cloneDeep(data);
								(
									clonedData as IntegrationData
								).actionDefinition.credential = credential;
								updateData(clonedData);
							}}
						>
							<Select.Trigger placeholder="Select a credential" />
							<Select.Content>
								{availableCredentials.map(
									(credential: string) => (
										<Select.Item
											key={credential}
											value={credential}
										>
											{credential}
										</Select.Item>
									),
								)}
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
						{parameter.dataType === ApiParameterDatatype.NUMBER && (
							<TextField.Root
								variant="surface"
								value={
									(data as IntegrationData).actionDefinition
										.params[parameter.id]
								}
								onChange={(event) => {
									const value = parseInt(event.target.value);
									const clonedData = cloneDeep(data);
									(
										clonedData as IntegrationData
									).actionDefinition.params[parameter.id] =
										Number.isNaN(value) ? undefined : value;

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
