"use client";

import { useGetSecretsSchemas } from "@/hooks/use-get-secret-schemas-api";
import { useToast } from "@/providers/toast";
import { MinusIcon, PlusIcon } from "@radix-ui/react-icons";
import {
	Box,
	Button,
	Dialog,
	DropdownMenu,
	Flex,
	IconButton,
	Text,
	TextField,
} from "@radix-ui/themes";
import { useEffect, useState } from "react";
import NamespaceIcon from "../workflow-editor/namespace-icon";
import Image from "next/image";
import { useSetSecretApi } from "@/hooks/use-set-secret-api";
import { useSecretsStore } from "@/stores/secrets-store";
import { useImmer } from "use-immer";
import SecretTextField from "../utils/secret-text-field";
import { snakeCaseToCapitalizedCase } from "@/lib/utils";

function hasDuplicateSecretKeyFields(
	secret: { key: string; value: string }[],
): boolean {
	return new Set(secret.map((kv) => kv.key)).size < secret.length;
}

function hasEmptyKeyOrValue(secret: { key: string; value: string }[]): boolean {
	return secret.some((kv) => kv.key.length === 0 || kv.value.length === 0);
}

export default function AddSecret() {
	const { data: secretsSchemas, error } = useGetSecretsSchemas();
	const { errorToast } = useToast();
	const [dialogState, setDialogState] = useImmer<{
		open: boolean;
		secretId: string;
		secretType: string | null;
		secret: { key: string; value: string }[];
		error: string | null;
	}>({
		open: false,
		secretId: "",
		secretType: null,
		secret: [],
		error: null,
	});
	const setSecret = useSetSecretApi();
	const { isDuplicateSecret, addNewSecret } = useSecretsStore();
	const [isSaving, setIsSaving] = useState<boolean>(false);

	useEffect(() => {
		if (error) {
			errorToast(
				"Failed to load secret schemas. Please reload the page.",
			);
		}
	}, [error]);

	const handleSaveSecret = async () => {
		try {
			setIsSaving(true);
			setDialogState((draft) => {
				draft.error = null;
			});

			if (hasDuplicateSecretKeyFields(dialogState.secret)) {
				setDialogState((draft) => {
					draft.error = "Key fields must be unique.";
				});
				return;
			}
			if (hasEmptyKeyOrValue(dialogState.secret)) {
				setDialogState((draft) => {
					draft.error = "Key and value fields must not be empty.";
				});
				return;
			}

			const trimmedSecretId = dialogState.secretId.trim();
			if (trimmedSecretId.length === 0) {
				setDialogState((draft) => {
					draft.error = "Secret Name must not be empty.";
				});
				return;
			}

			const newSecret = await setSecret.mutateAsync({
				secretId: dialogState.secretId.trim(),
				secretType: dialogState.secretType,
				secret: dialogState.secret,
			});
			addNewSecret(newSecret);

			setDialogState({
				...dialogState,
				open: false,
			});
		} catch (error) {
			setDialogState((draft) => {
				draft.error = "Failed to save secret. Please try again.";
			});
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<>
			<DropdownMenu.Root>
				<DropdownMenu.Trigger>
					<Button style={{ cursor: "pointer" }}>
						Add Secret
						<DropdownMenu.TriggerIcon />
					</Button>
				</DropdownMenu.Trigger>

				<DropdownMenu.Content variant="soft">
					{secretsSchemas &&
						secretsSchemas.map((secretTypeAndSchema, idx) => (
							<DropdownMenu.Item
								key={`add_secret_${secretTypeAndSchema[0]}_${idx}`}
								style={{ cursor: "pointer" }}
								onClick={() => {
									if (secretsSchemas) {
										setDialogState({
											open: true,
											secretId: "",
											secretType: secretTypeAndSchema[0],
											secret: secretTypeAndSchema[1].map(
												(field) => ({
													key: field,
													value: "",
												}),
											),
											error: null,
										});
									}
								}}
							>
								<NamespaceIcon
									namespace={secretTypeAndSchema[0]}
								/>{" "}
								{secretTypeAndSchema[0]}
							</DropdownMenu.Item>
						))}
					<DropdownMenu.Separator />

					<DropdownMenu.Item
						style={{ cursor: "pointer" }}
						onClick={() =>
							setDialogState({
								open: true,
								secretId: "",
								secretType: null,
								secret: [{ key: "", value: "" }],
								error: null,
							})
						}
					>
						<PlusIcon /> Custom Secret
					</DropdownMenu.Item>
				</DropdownMenu.Content>
			</DropdownMenu.Root>

			<Dialog.Root
				open={dialogState.open}
				onOpenChange={(_) => {
					if (isSaving) {
						// we don't allow to close while the secret is saving
						return;
					}
					setDialogState((draft) => {
						draft.open = false;
					});
				}}
			>
				<Dialog.Content maxWidth="540px">
					<Dialog.Title>
						<Flex gap="2" align="center">
							{dialogState.secretType ? (
								<Box height="18px" width="18px">
									<NamespaceIcon
										namespace={dialogState.secretType}
									/>
								</Box>
							) : (
								<Image
									src="/custom_secret_icon.svg"
									alt="Custom Secret Icon"
									width={18}
									height={18}
								/>
							)}
							<Text>
								Create {dialogState.secretType || "Custom"}{" "}
								Secret
							</Text>
						</Flex>
					</Dialog.Title>

					<Dialog.Description
						style={{
							color: "var(--Neutral-color-Neutral-Alpha-11, rgba(0, 7, 19, 0.62))",
						}}
					>
						Add your {dialogState.secretType || "custom"} secret.{" "}
						<u>
							<a
								href="https://docs.admyral.dev/integrations/integrations"
								target="_blank"
								rel="noopener noreferrer"
							>
								View documentation
							</a>
						</u>
						.
					</Dialog.Description>

					<Flex direction="column" mt="4" gap="4">
						<label>
							<Text as="div" size="2" mb="1" weight="bold">
								Secret Name
							</Text>
							<TextField.Root
								value={dialogState.secretId}
								onChange={(event) =>
									setDialogState((draft) => {
										draft.secretId = event.target.value;
									})
								}
								placeholder="Your Unique Secret Name"
							/>
							{isDuplicateSecret(dialogState.secretId) && (
								<Text color="red" size="1">
									Secret name must be unique!
								</Text>
							)}
						</label>

						{dialogState.secretType !== null ? (
							dialogState.secret.map((keyValue, idx) => (
								<label
									key={`secret_field_${dialogState.secretType}_${idx}`}
								>
									<Text
										as="div"
										size="2"
										mb="1"
										weight="bold"
									>
										{snakeCaseToCapitalizedCase(
											keyValue.key,
										)}
									</Text>
									<SecretTextField
										value={keyValue.value}
										onChange={(event) =>
											setDialogState((draft) => {
												draft.secret[idx].value =
													event.target.value;
											})
										}
										placeholder="Your Value"
									/>
								</label>
							))
						) : (
							<Flex direction="column" gap="4">
								{dialogState.secret.map((keyValue, idx) => (
									<Flex
										key={`secret_field_custom_secret_${idx}`}
										direction="column"
									>
										<Flex justify="between" mb="1">
											<Text
												as="div"
												size="2"
												mb="1"
												weight="bold"
											>
												Enter Key and Value
											</Text>
											<IconButton
												variant="soft"
												color="red"
												size="1"
												style={{
													cursor: "pointer",
												}}
												onClick={() =>
													setDialogState((draft) => {
														draft.secret.splice(
															idx,
															1,
														);
													})
												}
											>
												<MinusIcon />
											</IconButton>
										</Flex>
										<TextField.Root
											mb="2"
											value={keyValue.key}
											onChange={(event) =>
												setDialogState((draft) => {
													draft.secret[idx].key =
														event.target.value;
												})
											}
											placeholder="Key"
										/>
										<SecretTextField
											value={keyValue.value}
											onChange={(event) =>
												setDialogState((draft) => {
													draft.secret[idx].value =
														event.target.value;
												})
											}
											placeholder="Value"
										/>
									</Flex>
								))}

								<Button
									variant="soft"
									onClick={() =>
										setDialogState((draft) => {
											draft.secret.push({
												key: "",
												value: "",
											});
										})
									}
									style={{ cursor: "pointer" }}
								>
									<PlusIcon />
									Add new field
								</Button>
							</Flex>
						)}
					</Flex>

					{dialogState.error && (
						<Flex>
							<Text color="red">{dialogState.error}</Text>
						</Flex>
					)}

					<Flex gap="3" mt="4" justify="end">
						<Dialog.Close>
							<Button
								variant="soft"
								color="gray"
								style={{ cursor: "pointer" }}
							>
								Cancel
							</Button>
						</Dialog.Close>

						<Button
							disabled={
								dialogState.secretId.trim().length == 0 ||
								isDuplicateSecret(dialogState.secretId)
							}
							style={{ cursor: "pointer" }}
							loading={isSaving}
							onClick={handleSaveSecret}
						>
							Save
						</Button>
					</Flex>
				</Dialog.Content>
			</Dialog.Root>
		</>
	);
}
