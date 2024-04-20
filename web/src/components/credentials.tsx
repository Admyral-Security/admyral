"use client";

import { createCredential, deleteCredential, listCredentials } from "@/lib/api";
import { InfoCircledIcon, PlusIcon } from "@radix-ui/react-icons";
import {
	Box,
	Button,
	Callout,
	Card,
	Flex,
	Grid,
	IconButton,
	Text,
	TextField,
} from "@radix-ui/themes";
import { useEffect, useState } from "react";
import TrashIcon from "./icons/trash-icon";

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
			<svg
				width="18"
				height="18"
				viewBox="0 0 18 18"
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
			>
				<path
					d="M3 2.25H12.75L15.5303 5.03033C15.6709 5.17098 15.75 5.36175 15.75 5.56066V15C15.75 15.4142 15.4142 15.75 15 15.75H3C2.58579 15.75 2.25 15.4142 2.25 15V3C2.25 2.58579 2.58579 2.25 3 2.25ZM9 13.5C10.2427 13.5 11.25 12.4927 11.25 11.25C11.25 10.0073 10.2427 9 9 9C7.75733 9 6.75 10.0073 6.75 11.25C6.75 12.4927 7.75733 13.5 9 13.5ZM3.75 3.75V6.75H11.25V3.75H3.75Z"
					fill="#00259E"
					fill-opacity="0.797"
				/>
			</svg>
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

interface Credential {
	name: string;
	value: string;
	isUnsaved: boolean;
	loading: boolean;
	error: string | null;
}

export default function Credentials() {
	const [credentials, setCredentials] = useState<Credential[]>([]);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		listCredentials()
			.then((credentialNames) => {
				setCredentials(
					credentialNames.map((name: string) => ({
						name,
						value: "",
						isUnsaved: false,
						loading: false,
					})),
				);
			})
			.catch((error) => {
				setError(
					"Failed to load credentials. If the problem persists, please contact us on Discord or via email support@admyral.com.",
				);
			});
	}, []);

	const setLoading = (credentialName: string) => {
		setCredentials(
			[...credentials].map((credential) => {
				if (credential.name === credentialName) {
					credential.loading = true;
				}
				return credential;
			}),
		);
	};

	const create = async (credentialName: string, value: string) => {
		try {
			setError(null);
			setLoading(credentialName);
			await createCredential(credentialName, value);
			setCredentials(
				[...credentials].map((credential) => {
					if (credential.name === credentialName) {
						return {
							name: credentialName,
							value: "",
							isUnsaved: false,
							loading: false,
							error: null,
						};
					}
					return credential;
				}),
			);
		} catch (error) {
			setError(
				`Failed to save credential: ${credentialName}. If the problem persists, please contact us on Discord or via email ${process.env.NEXT_PUBLIC_SUPPORT_EMAIL}`,
			);
		}
	};

	const remove = async (credentialName: string) => {
		try {
			setError(null);
			setLoading(credentialName);
			await deleteCredential(credentialName);
			setCredentials(
				[...credentials].filter(
					(credential) =>
						credential.name !== credentialName &&
						!credential.isUnsaved,
				),
			);
		} catch (error) {
			setError(
				`Failed to remove credential: ${credentialName}. If the problem persists, please contact us on Discord or via email ${process.env.NEXT_PUBLIC_SUPPORT_EMAIL}`,
			);
		}
	};

	const checkForDuplicateCredentialName = (credentialName: string) => {
		return credentials.find(
			(credential) =>
				!credential.isUnsaved && credential.name === credentialName,
		);
	};

	const isValidCredentialPattern = (credentialName: string) => {
		return credentialName.match(/^[a-zA-Z][a-zA-Z0-9-_]*$/);
	};

	const handleSaveButtonClick = (credential: Credential, idx: number) => {
		let errorMessage = null;
		if (!isValidCredentialPattern(credential.name)) {
			errorMessage =
				"Credential name must start with a letter and contain only letters, numbers, hyphens, and underscores.";
		}

		if (checkForDuplicateCredentialName(credential.name)) {
			errorMessage = "Credential name already exists and must be unique.";
		}

		if (errorMessage !== null) {
			const credentialsCopy = [...credentials];
			credentialsCopy[idx].error = errorMessage;
			setCredentials(credentialsCopy);
			return;
		}

		create(credential.name, credential.value);
	};

	return (
		<Box width="50%">
			<Card size="3" variant="classic">
				<Flex direction="column" gap="5">
					<Flex justify="between">
						<Text size="4">Credentials</Text>

						<Button
							variant="solid"
							size="2"
							style={{ cursor: "pointer" }}
							onClick={() =>
								setCredentials([
									...credentials,
									{
										name: "",
										value: "",
										isUnsaved: true,
										loading: false,
										error: null,
									},
								])
							}
						>
							<PlusIcon />
							New credential
						</Button>
					</Flex>

					{error && (
						<Callout.Root color="red">
							<Callout.Icon>
								<InfoCircledIcon />
							</Callout.Icon>
							<Callout.Text>{error}</Callout.Text>
						</Callout.Root>
					)}

					{credentials.length === 0 && <NoCredentialsInfo />}

					{credentials.map((credential, idx) => (
						<Flex
							key={`credentials_${idx}`}
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
										disabled={!credential.isUnsaved}
										onChange={(event) => {
											const credentialName =
												event.target.value;
											const credentialsCopy = [
												...credentials,
											];
											credentialsCopy[idx].name =
												event.target.value;
											credentialsCopy[idx].error = null;
											setCredentials(credentialsCopy);
										}}
									/>
								</Flex>

								<Flex direction="column" gap="2" px="2">
									<Text>Value</Text>
									<TextField.Root
										type={
											credential.isUnsaved
												? undefined
												: "password"
										}
										disabled={!credential.isUnsaved}
										variant="surface"
										value={
											credential.isUnsaved
												? credential.value
												: "some-random-stuff"
										}
										onChange={(event) => {
											const credentialsCopy = [
												...credentials,
											];
											credentialsCopy[idx].value =
												event.target.value;
											setCredentials(credentialsCopy);
										}}
									/>
								</Flex>

								<Flex justify="end" width="100%">
									{credential.isUnsaved ? (
										<SaveButton
											disabled={credential.error !== null}
											loading={credential.loading}
											onClick={() =>
												handleSaveButtonClick(
													credential,
													idx,
												)
											}
										/>
									) : (
										<DeleteButton
											disabled={credential.loading}
											loading={credential.loading}
											onClick={() =>
												remove(credential.name)
											}
										/>
									)}
								</Flex>
							</Grid>

							{credential.error && credential.isUnsaved && (
								<Text color="red">{credential.error}</Text>
							)}
						</Flex>
					))}
				</Flex>
			</Card>
		</Box>
	);
}
