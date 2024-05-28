"use client";

import { createCredential, deleteCredential, listCredentials } from "@/lib/api";
import { InfoCircledIcon, PlusIcon } from "@radix-ui/react-icons";
import {
	Box,
	Button,
	Callout,
	Card,
	DropdownMenu,
	Flex,
	Grid,
	IconButton,
	Text,
	TextField,
} from "@radix-ui/themes";
import { useEffect, useState } from "react";
import TrashIcon from "./icons/trash-icon";
import {
	INTEGRATIONS,
	IntegrationType,
	IntegrationCredentialDefinition,
} from "@/lib/integrations";
import IntegrationLogoIcon from "./integration-logo-icon";
import { Credential } from "@/lib/types";
import ArrowDownIcon from "./icons/arrow-down-icon";
import FloppyDiskIcon from "./icons/floppy-disk-icon";

const IS_LOADING: boolean = true;
const IS_NOT_LOADING: boolean = false;

function NoCredentialsInfo() {
	return (
		<Callout.Root variant="surface" size="3" highContrast>
			<Callout.Icon>
				<InfoCircledIcon />
			</Callout.Icon>
			<Callout.Text size="3">
				No credentials have been created yet.
			</Callout.Text>
		</Callout.Root>
	);
}

interface ButtonProps {
	onClick: () => void;
	loading?: boolean;
	disabled?: boolean;
}

function SaveButton({
	onClick,
	loading = false,
	disabled = false,
}: ButtonProps) {
	return (
		<IconButton
			onClick={onClick}
			variant="soft"
			style={{ cursor: "pointer" }}
			loading={loading}
			disabled={disabled}
		>
			<FloppyDiskIcon />
		</IconButton>
	);
}

function DeleteButton({
	onClick,
	loading = false,
	disabled = false,
}: ButtonProps) {
	return (
		<IconButton
			onClick={onClick}
			variant="soft"
			color="red"
			style={{ cursor: "pointer" }}
			loading={loading}
			disabled={disabled}
		>
			<TrashIcon color="#e5484d" />
		</IconButton>
	);
}

interface OtherCredential {
	key: string;
	name: string;
	value: string;
	isPersisted: boolean;
	loading: boolean;
	error: string | null;
}

interface IntegrationCredential {
	key: string;
	name: string;
	integrationType: IntegrationType;
	values: { id: string; value: string }[];
	isPersisted: boolean;
	loading: boolean;
	error: string | null;
}

function isOtherCredential(credentials: Credential): boolean {
	return credentials.credentialType === null;
}

function isIntegrationCredential(credentials: Credential): boolean {
	return credentials.credentialType !== null;
}

export default function Credentials() {
	const [integrationsCredentials, setIntegrationsCredentials] = useState<
		IntegrationCredential[]
	>([]);
	const [otherCredentials, setOtherCredentials] = useState<OtherCredential[]>(
		[],
	);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		listCredentials()
			.then((credentials: Credential[]) => {
				setOtherCredentials(
					credentials
						.filter(isOtherCredential)
						.map((credential: Credential) => ({
							key: `other_credentials_${Math.random()}`,
							name: credential.name,
							value: "",
							isPersisted: true,
							loading: false,
							error: null,
						})),
				);

				setIntegrationsCredentials(
					credentials
						.filter(isIntegrationCredential)
						.map((credential: Credential) => ({
							key: `integration_credentials_${Math.random()}`,
							name: credential.name,
							integrationType: credential.credentialType!,
							values: INTEGRATIONS[
								credential.credentialType!
							].credentials.map(
								(def: IntegrationCredentialDefinition) => ({
									id: def.id,
									value: "",
								}),
							),
							isPersisted: true,
							loading: false,
							error: null,
						})),
				);
			})
			.catch((error) => {
				setError(
					`Failed to load credentials. If the problem persists, please contact us on Discord or via email ${process.env.NEXT_PUBLIC_SUPPORT_EMAIL}.`,
				);
			});
	}, []);

	const setLoading = (credentialName: string, isLoading: boolean) => {
		setOtherCredentials(
			[...otherCredentials].map((credential: OtherCredential) => {
				if (credential.name === credentialName) {
					credential.loading = isLoading;
				}
				return credential;
			}),
		);

		setIntegrationsCredentials(
			[...integrationsCredentials].map(
				(credential: IntegrationCredential) => {
					if (credential.name === credentialName) {
						credential.loading = isLoading;
					}
					return credential;
				},
			),
		);
	};

	const removeIntegrationsCredentials = async (integrationIdx: number) => {
		setError(null);
		if (!integrationsCredentials[integrationIdx].isPersisted) {
			return;
		}

		const credentialName = integrationsCredentials[integrationIdx].name;

		try {
			setLoading(credentialName, IS_LOADING);
			await deleteCredential(credentialName);

			setIntegrationsCredentials(
				[...integrationsCredentials].filter(
					(credential) =>
						credential.name !== credentialName &&
						credential.isPersisted,
				),
			);
		} catch (error) {
			setLoading(credentialName, IS_NOT_LOADING);
			setError(
				`Failed to remove credential: ${credentialName}. If the problem persists, please contact us on Discord or via email ${process.env.NEXT_PUBLIC_SUPPORT_EMAIL}`,
			);
		}
	};

	const removeOtherCredentials = async (integrationIdx: number) => {
		setError(null);
		if (!otherCredentials[integrationIdx].isPersisted) {
			return;
		}

		const credentialName = otherCredentials[integrationIdx].name;

		try {
			setLoading(credentialName, IS_LOADING);
			await deleteCredential(credentialName);

			setOtherCredentials(
				[...otherCredentials].filter(
					(credential) =>
						credential.name !== credentialName &&
						credential.isPersisted,
				),
			);
		} catch (error) {
			setLoading(credentialName, IS_NOT_LOADING);
			setError(
				`Failed to remove credential: ${credentialName}. If the problem persists, please contact us on Discord or via email ${process.env.NEXT_PUBLIC_SUPPORT_EMAIL}`,
			);
		}
	};

	const checkForDuplicateCredentialName = (credentialName: string) => {
		return (
			otherCredentials.find(
				(credential) =>
					credential.isPersisted &&
					credential.name === credentialName,
			) ||
			integrationsCredentials.find(
				(credential) =>
					credential.isPersisted &&
					credential.name === credentialName,
			)
		);
	};

	const isValidCredentialPattern = (credentialName: string) => {
		return credentialName.match(/^[a-zA-Z][a-zA-Z0-9-_]*$/);
	};

	const handleOtherCredentialSaveButtonClick = async (
		credential: OtherCredential,
		idx: number,
	) => {
		let errorMessage = null;
		if (!isValidCredentialPattern(credential.name)) {
			errorMessage =
				"Credential name must start with a letter and contain only letters, numbers, hyphens, and underscores.";
		}

		if (checkForDuplicateCredentialName(credential.name)) {
			errorMessage = "Credential name already exists and must be unique.";
		}

		if (errorMessage !== null) {
			const credentialsCopy = [...otherCredentials];
			credentialsCopy[idx].error = errorMessage;
			setOtherCredentials(credentialsCopy);
			return;
		}

		try {
			setError(null);
			setLoading(credential.name, IS_LOADING);
			await createCredential(credential.name, credential.value);

			setOtherCredentials(
				[...otherCredentials].map((credential) => {
					if (credential.name === credential.name) {
						return {
							key: credential.key,
							name: credential.name,
							value: "",
							isPersisted: true,
							loading: false,
							error: null,
						};
					}
					return credential;
				}),
			);
		} catch (error) {
			setLoading(credential.name, IS_NOT_LOADING);
			setError(
				`Failed to save credential: ${credential.name}. If the problem persists, please contact us on Discord or via email ${process.env.NEXT_PUBLIC_SUPPORT_EMAIL}`,
			);
		}
	};

	const handleIntegrationCredentialSaveButtonClick = async (
		credential: IntegrationCredential,
		idx: number,
	) => {
		if (checkForDuplicateCredentialName(credential.name)) {
			const credentialsCopy = [...integrationsCredentials];
			credentialsCopy[idx].error =
				"Credential name already exists and must be unique.";
			setIntegrationsCredentials(credentialsCopy);
			return;
		}

		try {
			setError(null);
			setLoading(credential.name, IS_LOADING);

			await createCredential(
				credential.name,
				JSON.stringify(
					Object.fromEntries(
						credential.values.map((v) => [v.id, v.value]),
					),
				),
				credential.integrationType,
			);

			setIntegrationsCredentials(
				[...integrationsCredentials].map((credential) => {
					if (credential.name === credential.name) {
						return {
							key: credential.key,
							name: credential.name,
							integrationType: credential.integrationType,
							values: INTEGRATIONS[
								credential.integrationType!
							].credentials.map(
								(def: IntegrationCredentialDefinition) => ({
									id: def.id,
									value: "",
								}),
							),
							isPersisted: true,
							loading: false,
							error: null,
						};
					}
					return credential;
				}),
			);
		} catch (error) {
			setLoading(credential.name, IS_NOT_LOADING);
			setError(
				`Failed to save credential: ${credential.name}. If the problem persists, please contact us on Discord or via email ${process.env.NEXT_PUBLIC_SUPPORT_EMAIL}`,
			);
		}
	};

	return (
		<Box width="50%">
			<Card size="3" variant="classic">
				<Flex direction="column" gap="5">
					<Flex justify="between">
						<Text size="4" weight="medium">
							Credentials
						</Text>

						<DropdownMenu.Root>
							<DropdownMenu.Trigger>
								<Button
									variant="solid"
									size="2"
									style={{ cursor: "pointer" }}
								>
									Create New Credential
									<ArrowDownIcon />
								</Button>
							</DropdownMenu.Trigger>

							<DropdownMenu.Content variant="soft">
								{Object.keys(INTEGRATIONS)
									.filter(
										(integration: string) =>
											INTEGRATIONS[integration]
												.credentials.length > 0,
									)
									.map((integration: string) => (
										<DropdownMenu.Item
											key={`credentials_integrations_${integration}`}
											style={{
												cursor: "pointer",
											}}
											onClick={() =>
												setIntegrationsCredentials([
													...integrationsCredentials,
													{
														key: `integration_credentials_${Math.random()}`,
														name: "",
														integrationType:
															integration as IntegrationType,
														values: INTEGRATIONS[
															integration as IntegrationType
														].credentials.map(
															(
																def: IntegrationCredentialDefinition,
															) => ({
																id: def.id,
																value: "",
															}),
														),
														isPersisted: false,
														loading: false,
														error: null,
													},
												])
											}
										>
											<Grid
												columns="20px 1fr"
												gap="2"
												justify="center"
												align="center"
											>
												<IntegrationLogoIcon
													integration={
														integration as IntegrationType
													}
												/>
												<Text>
													{
														INTEGRATIONS[
															integration as IntegrationType
														].name
													}
												</Text>
											</Grid>
										</DropdownMenu.Item>
									))}
								<DropdownMenu.Item
									style={{
										cursor: "pointer",
									}}
									onClick={() =>
										setOtherCredentials([
											...otherCredentials,
											{
												key: `other_credentials_${Math.random()}`,
												name: "",
												value: "",
												isPersisted: false,
												loading: false,
												error: null,
											},
										])
									}
								>
									<Grid
										columns="20px 1fr"
										gap="2"
										justify="center"
										align="center"
									>
										<Flex justify="center" align="center">
											<PlusIcon />
										</Flex>
										<Text>Other</Text>
									</Grid>
								</DropdownMenu.Item>
							</DropdownMenu.Content>
						</DropdownMenu.Root>
					</Flex>

					{error && (
						<Callout.Root color="red">
							<Callout.Icon>
								<InfoCircledIcon />
							</Callout.Icon>
							<Callout.Text>{error}</Callout.Text>
						</Callout.Root>
					)}

					{otherCredentials.length === 0 &&
						integrationsCredentials.length === 0 &&
						error === null && <NoCredentialsInfo />}

					{integrationsCredentials.map(
						(credential, integrationIdx) => (
							<Flex
								key={credential.key}
								direction="column"
								gap="2"
							>
								<Flex gap="2">
									<IntegrationLogoIcon
										integration={credential.integrationType}
									/>
									<Text weight="medium">
										{
											INTEGRATIONS[
												credential.integrationType
											].name
										}
									</Text>
								</Flex>

								<Flex direction="column" gap="2">
									<Text>Integration Name</Text>
									<TextField.Root
										variant="surface"
										value={credential.name}
										disabled={credential.isPersisted}
										onChange={(event) => {
											const credentialsCopy = [
												...integrationsCredentials,
											];
											credentialsCopy[
												integrationIdx
											].name = event.target.value;
											setIntegrationsCredentials(
												credentialsCopy,
											);
										}}
									/>
								</Flex>

								{credential.values.map(
									(credentialParameter, idx) => (
										<Flex
											key={`credentials_${credential.integrationType}_${integrationIdx}_${credentialParameter.id}`}
											direction="column"
											gap="2"
										>
											<Text>
												{
													INTEGRATIONS[
														credential
															.integrationType
													].credentials[idx]
														.displayName
												}
											</Text>
											<TextField.Root
												variant="surface"
												disabled={
													credential.isPersisted
												}
												type={
													credential.isPersisted
														? "password"
														: undefined
												}
												value={
													credential.isPersisted
														? "some-random-stuff"
														: credentialParameter.value
												}
												onChange={(event) => {
													const credentialsCopy = [
														...integrationsCredentials,
													];
													credentialsCopy[
														integrationIdx
													].values[idx].value =
														event.target.value;
													setIntegrationsCredentials(
														credentialsCopy,
													);
												}}
											/>
										</Flex>
									),
								)}

								{credential.error &&
									!credential.isPersisted && (
										<Text color="red">
											{credential.error}
										</Text>
									)}

								<Flex justify="end" width="100%">
									{credential.isPersisted ? (
										<Button
											variant="soft"
											color="red"
											loading={credential.loading}
											onClick={() =>
												removeIntegrationsCredentials(
													integrationIdx,
												)
											}
											style={{ cursor: "pointer" }}
										>
											<TrashIcon color="#e5484d" />
											Delete Credential
										</Button>
									) : (
										<Button
											variant="soft"
											loading={credential.loading}
											onClick={() =>
												handleIntegrationCredentialSaveButtonClick(
													credential,
													integrationIdx,
												)
											}
											style={{ cursor: "pointer" }}
										>
											<FloppyDiskIcon />
											Save Credential
										</Button>
									)}
								</Flex>
							</Flex>
						),
					)}

					{otherCredentials.length > 0 && (
						<Flex gap="2" direction="column">
							<Text weight="medium">Others</Text>

							{otherCredentials.map((credential, idx) => (
								<Flex
									key={credential.key}
									direction="column"
									gap="2"
								>
									<Grid
										columns="1fr 1fr 38px"
										align="end"
										justify="start"
									>
										<Flex direction="column" gap="2">
											<Text>Name</Text>
											<TextField.Root
												variant="surface"
												value={credential.name}
												disabled={
													credential.isPersisted
												}
												onChange={(event) => {
													const credentialsCopy = [
														...otherCredentials,
													];
													credentialsCopy[idx].name =
														event.target.value;
													credentialsCopy[idx].error =
														null;
													setOtherCredentials(
														credentialsCopy,
													);
												}}
											/>
										</Flex>

										<Flex direction="column" gap="2" px="2">
											<Text>Value</Text>
											<TextField.Root
												variant="surface"
												disabled={
													credential.isPersisted
												}
												type={
													credential.isPersisted
														? "password"
														: undefined
												}
												value={
													credential.isPersisted
														? "some-random-stuff"
														: credential.value
												}
												onChange={(event) => {
													const credentialsCopy = [
														...otherCredentials,
													];
													credentialsCopy[idx].value =
														event.target.value;
													setOtherCredentials(
														credentialsCopy,
													);
												}}
											/>
										</Flex>

										<Flex justify="end" width="100%">
											{credential.isPersisted ? (
												<DeleteButton
													disabled={
														credential.loading
													}
													loading={credential.loading}
													onClick={() =>
														removeOtherCredentials(
															idx,
														)
													}
												/>
											) : (
												<SaveButton
													disabled={
														credential.error !==
														null
													}
													loading={credential.loading}
													onClick={() =>
														handleOtherCredentialSaveButtonClick(
															credential,
															idx,
														)
													}
												/>
											)}
										</Flex>
									</Grid>

									{credential.error &&
										!credential.isPersisted && (
											<Text color="red">
												{credential.error}
											</Text>
										)}
								</Flex>
							))}
						</Flex>
					)}
				</Flex>
			</Card>
		</Box>
	);
}
