"use client";

import { TSecretMetadata } from "@/types/secrets";
import {
	Box,
	Button,
	Dialog,
	DropdownMenu,
	Flex,
	IconButton,
	Table,
	Text,
	TextField,
} from "@radix-ui/themes";
import Image from "next/image";
import NamespaceIcon from "../workflow-editor/namespace-icon";
import {
	DotsVerticalIcon,
	MinusIcon,
	PlusIcon,
	TrashIcon,
} from "@radix-ui/react-icons";
import { useSecretsStore } from "@/stores/secrets-store";
import { useDeleteSecretApi } from "@/hooks/use-delete-secret-api";
import { useToast } from "@/providers/toast";
import { useImmer } from "use-immer";
import { hasEmptyKey, snakeCaseToCapitalizedCase } from "@/lib/utils";
import SecretTextField from "../utils/secret-text-field";
import { useState } from "react";
import { useUpdateSecretApi } from "@/hooks/use-update-secret-api";

function hasEmptyValueFieldsForNewFields(
	secret: { key: string; value: string }[],
	isNew: boolean[],
): boolean {
	return isNew.some(
		(isFieldNew, idx) => isFieldNew && secret[idx].value.length === 0,
	);
}

interface SecretRowProps {
	secret: TSecretMetadata;
	idx: number;
}

export default function SecretRow({ secret, idx }: SecretRowProps) {
	const { secrets, removeSecret, updateSecret } = useSecretsStore();
	const deleteSecret = useDeleteSecretApi();
	const { errorToast } = useToast();
	const [dialogState, setDialogState] = useImmer<{
		open: boolean;
		secret: { key: string; value: string }[];
		isNew: boolean[];
		error: string | null;
	}>({
		open: false,
		secret: secret.secretSchema.map((key) => ({ key, value: "" })),
		isNew: Array(secret.secretSchema.length).fill(false),
		error: null,
	});
	const [isUpdating, setIsUpdating] = useState<boolean>(false);
	const updateSecretApi = useUpdateSecretApi();

	const handleDeleteSecret = async () => {
		try {
			setDialogState((draft) => ({
				open: false,
				secret: secret.secretSchema.map((key) => ({ key, value: "" })),
				isNew: Array(secret.secretSchema.length).fill(false),
				error: null,
			}));
			await deleteSecret.mutateAsync({ secretId: secrets[idx].secretId });
			removeSecret(idx);
		} catch (error) {
			errorToast("Failed to delete secret. Please try again.");
		}
	};

	const handleUpdateSecret = async () => {
		try {
			setIsUpdating(true);
			setDialogState((draft) => {
				draft.error = null;
			});

			if (hasEmptyKey(dialogState.secret)) {
				setDialogState((draft) => {
					draft.error = "Keys must not be empty.";
				});
				return;
			}

			if (
				hasEmptyValueFieldsForNewFields(
					dialogState.secret,
					dialogState.isNew,
				)
			) {
				setDialogState((draft) => {
					draft.error =
						"Values must not be empty for newly added fields.";
				});
				return;
			}

			const updatedSecret = await updateSecretApi.mutateAsync({
				...secret,
				secret: dialogState.secret,
			});
			updateSecret(idx, updatedSecret);

			setDialogState((draft) => {
				draft.open = false;
			});
		} catch (error) {
			setDialogState((draft) => {
				draft.error =
					"Failed to update secret. Please try again or contact support if the problem persists.";
			});
		} finally {
			setIsUpdating(false);
		}
	};

	return (
		<>
			<Table.Row
				className="hover:bg-gray-50 cursor-pointer"
				onClick={() =>
					setDialogState((draft) => {
						draft.open = true;
						draft.secret = secret.secretSchema.map((key) => ({
							key,
							value: "",
						}));
						draft.isNew = Array(secret.secretSchema.length).fill(
							false,
						);
					})
				}
			>
				<Table.Cell>
					{secret.secretType ? (
						<NamespaceIcon namespace={secret.secretType} />
					) : (
						<Image
							src="/custom_secret_icon.svg"
							alt="Custom Secret Icon"
							width={18}
							height={18}
						/>
					)}
				</Table.Cell>
				<Table.RowHeaderCell>{secret.secretId}</Table.RowHeaderCell>
				<Table.Cell>
					{secret.updatedAt.toLocaleString("en-US")}
				</Table.Cell>
				<Table.Cell>
					{secret.createdAt.toLocaleString("en-US")}
				</Table.Cell>
				<Table.Cell>{secret.email}</Table.Cell>
				<Table.Cell>
					<Flex justify="end">
						<DropdownMenu.Root>
							<DropdownMenu.Trigger>
								<IconButton
									variant="ghost"
									style={{ cursor: "pointer" }}
								>
									<DotsVerticalIcon />
								</IconButton>
							</DropdownMenu.Trigger>

							<DropdownMenu.Content variant="soft">
								<DropdownMenu.Item
									onClick={(e) => {
										e.stopPropagation();
										handleDeleteSecret();
									}}
								>
									<TrashIcon />
									Delete
								</DropdownMenu.Item>
							</DropdownMenu.Content>
						</DropdownMenu.Root>
					</Flex>
				</Table.Cell>
			</Table.Row>

			<Dialog.Root
				open={dialogState.open}
				onOpenChange={(open) =>
					setDialogState((draft) => {
						draft.open = open;
					})
				}
			>
				<Dialog.Content>
					<Dialog.Title>
						<Flex gap="2" align="center">
							{secret.secretType ? (
								<Box height="18px" width="18px">
									<NamespaceIcon
										namespace={secret.secretType}
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
								Edit {secret.secretType || "Custom"} Secret
							</Text>
						</Flex>
					</Dialog.Title>
					<Dialog.Description
						style={{
							color: "var(--Neutral-color-Neutral-Alpha-11, rgba(0, 7, 19, 0.62))",
						}}
					>
						Update your secret by overwriting fields. If a value
						field is empty, the old value will be kept.{" "}
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
							<TextField.Root value={secret.secretId} disabled />
						</label>

						{secret.secretType !== null ? (
							dialogState.secret.map((keyValue, idx) => (
								<label
									key={`secret_row_edit_${secret.secretType}_${idx}`}
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
										placeholder="Your Value Update"
									/>
								</label>
							))
						) : (
							<Flex direction="column" gap="4">
								{dialogState.secret.map((keyValue, idx) => (
									<Flex
										key={`secret_row_edit_custom_${idx}`}
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
														draft.isNew.splice(
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
											placeholder="Your Key"
										/>
										<SecretTextField
											value={keyValue.value}
											onChange={(event) =>
												setDialogState((draft) => {
													draft.secret[idx].value =
														event.target.value;
												})
											}
											placeholder="Your Value Update"
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
											draft.isNew.push(true);
										})
									}
									style={{ cursor: "pointer" }}
								>
									<PlusIcon />
									Add new field
								</Button>
							</Flex>
						)}

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
								style={{ cursor: "pointer" }}
								loading={isUpdating}
								onClick={handleUpdateSecret}
							>
								Update Fields
							</Button>
						</Flex>
					</Flex>
				</Dialog.Content>
			</Dialog.Root>
		</>
	);
}
