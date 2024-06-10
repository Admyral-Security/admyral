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
import { Suspense, useEffect, useState } from "react";
import TrashIcon from "./icons/trash-icon";
import {
	INTEGRATIONS,
	IntegrationType,
	AuthType,
	SecretAuthentication,
	IntegrationCredentialFormParameter,
	MSTeamsOAuth,
} from "@/lib/integrations";
import IntegrationLogoIcon from "./integration-logo-icon";
import { Credential } from "@/lib/types";
import ArrowDownIcon from "./icons/arrow-down-icon";
import FloppyDiskIcon from "./icons/floppy-disk-icon";
import useSearchParameterError, {
	SearchParameterErrorProvider,
} from "@/providers/search-paramater-error-provider";
import useCsrfToken, {
	CsrfTokenProvider,
} from "@/providers/csrf-token-provider";
import { LLMS } from "@/lib/llm";

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

function generateEmptyValueCredentialParameter(
	integration: IntegrationType,
): { id: string; value: string }[] {
	if (
		LLMS[integration] === undefined &&
		INTEGRATIONS[integration] === undefined
	) {
		return [];
	}
	if (INTEGRATIONS[integration] !== undefined) {
		return INTEGRATIONS[integration].credential.authType === AuthType.SECRET
			? (
					INTEGRATIONS[integration].credential as SecretAuthentication
				).parameters.map((def: IntegrationCredentialFormParameter) => ({
					id: def.id,
					value: "",
				}))
			: [];
	}
	return LLMS[integration].credentials!.map(
		(def: IntegrationCredentialFormParameter) => ({
			id: def.id,
			value: "",
		}),
	);
}

function getMSTeamOAuthLoginUrl(csrfToken: string | null): string | null {
	if (
		csrfToken === null ||
		process.env.NEXT_PUBLIC_MS_TEAMS_OAUTH_CLIENT_ID === undefined ||
		process.env.NEXT_PUBLIC_DOMAIN === undefined
	) {
		return null;
	}

	// Generate a random value to prevent CSRF attacks
	const clientId = process.env.NEXT_PUBLIC_MS_TEAMS_OAUTH_CLIENT_ID;
	const redirectUri = `${process.env.NEXT_PUBLIC_DOMAIN}/integrations/callback/ms-teams`;
	const scope = (
		INTEGRATIONS[IntegrationType.MS_TEAMS].credential as MSTeamsOAuth
	).scope;
	return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}&response_mode=query&scope=${encodeURI(scope)}&state=${csrfToken}`;
}

function CredentialsChild() {
	const [integrationsCredentials, setIntegrationsCredentials] = useState<
		IntegrationCredential[]
	>([]);
	const [otherCredentials, setOtherCredentials] = useState<OtherCredential[]>(
		[],
	);
	const [error, setError] = useState<string | null>(null);

	const { csrfToken } = useCsrfToken();

	// Check for OAuth errors. If yes, display an error message
	const { error: oauthError, resetError: resetOAuthError } =
		useSearchParameterError();
	useEffect(() => {
		if (oauthError !== null) {
			setError(oauthError);
			resetOAuthError();
		}
	}, [oauthError]);

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
							values: generateEmptyValueCredentialParameter(
								credential.credentialType as IntegrationType,
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
							values: generateEmptyValueCredentialParameter(
								credential.integrationType,
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
											INTEGRATIONS[integration].credential
												.authType !== AuthType.NONE,
									)
									.map((integration: string) => {
										const authType =
											INTEGRATIONS[integration].credential
												.authType;

										if (
											authType === AuthType.MS_TEAMS_OAUTH
										) {
											const url =
												getMSTeamOAuthLoginUrl(
													csrfToken,
												);
											if (url === null) {
												// MS Teams OAuth not configured
												return <></>;
											}

											return (
												<a
													key={`credentials_integrations_${integration}`}
													href={url}
												>
													<DropdownMenu.Item
														style={{
															cursor: "pointer",
														}}
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
												</a>
											);
										}

										return (
											<DropdownMenu.Item
												key={`credentials_integrations_${integration}`}
												style={{
													cursor: "pointer",
												}}
												onClick={() => {
													setIntegrationsCredentials([
														{
															key: `integration_credentials_${Math.random()}`,
															name: "",
															integrationType:
																integration as IntegrationType,
															values: generateEmptyValueCredentialParameter(
																integration as IntegrationType,
															),
															isPersisted: false,
															loading: false,
															error: null,
														},
														...integrationsCredentials,
													]);
												}}
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
										);
									})}
								{Object.keys(LLMS)
									.filter(
										(llmProvider) =>
											LLMS[llmProvider].credentials !==
											undefined,
									)
									.map((llmProvider: string) => (
										<DropdownMenu.Item
											key={`credentials_integrations_${llmProvider}`}
											style={{
												cursor: "pointer",
											}}
											onClick={() => {
												setIntegrationsCredentials([
													{
														key: `integration_credentials_${Math.random()}`,
														name: "",
														integrationType:
															llmProvider as IntegrationType,
														values: generateEmptyValueCredentialParameter(
															llmProvider as IntegrationType,
														),
														isPersisted: false,
														loading: false,
														error: null,
													},
													...integrationsCredentials,
												]);
											}}
										>
											<Grid
												columns="20px 1fr"
												gap="2"
												justify="center"
												align="center"
											>
												<IntegrationLogoIcon
													integration={
														llmProvider as IntegrationType
													}
												/>
												<Text>
													{LLMS[llmProvider].name}
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
										{INTEGRATIONS[
											credential.integrationType
										] !== undefined
											? INTEGRATIONS[
													credential.integrationType
												].name
											: LLMS[credential.integrationType]
													.name}
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

								{LLMS[credential.integrationType] !==
									undefined &&
									credential.values.map(
										(
											credentialParameter: any,
											idx: number,
										) => (
											<Flex
												key={`credentials_${credential.integrationType}_${integrationIdx}_${credentialParameter.id}`}
												direction="column"
												gap="2"
											>
												<Text>
													{
														LLMS[
															credential
																.integrationType
														].credentials![idx]
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
														const credentialsCopy =
															[
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

								{INTEGRATIONS[credential.integrationType] !==
									undefined &&
									INTEGRATIONS[credential.integrationType]
										.credential.authType ===
										AuthType.SECRET &&
									credential.values.map(
										(credentialParameter, idx) => (
											<Flex
												key={`credentials_${credential.integrationType}_${integrationIdx}_${credentialParameter.id}`}
												direction="column"
												gap="2"
											>
												<Text>
													{
														(
															INTEGRATIONS[
																credential
																	.integrationType
															]
																.credential as SecretAuthentication
														).parameters[idx]
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
														const credentialsCopy =
															[
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

export default function Credentials() {
	return (
		<Suspense fallback={null}>
			<CsrfTokenProvider>
				<SearchParameterErrorProvider>
					<CredentialsChild />
				</SearchParameterErrorProvider>
			</CsrfTokenProvider>
		</Suspense>
	);
}
