"use client";

import { useGetSecretsSchemas } from "@/hooks/use-get-secret-schemas-api";
import { useToast } from "@/providers/toast";
import { PlusIcon } from "@radix-ui/react-icons";
import {
	Box,
	Button,
	Dialog,
	DropdownMenu,
	Flex,
	Text,
} from "@radix-ui/themes";
import { useEffect, useState } from "react";
import NamespaceIcon from "../workflow-editor/namespace-icon";
import Image from "next/image";

export default function AddSecret() {
	const { data: secretsSchemas, error } = useGetSecretsSchemas();
	const { errorToast } = useToast();
	const [dialogState, setDialogState] = useState<{
		open: boolean;
		secretType: string | null;
	}>({
		open: false,
		secretType: null,
	});

	useEffect(() => {
		if (error) {
			errorToast(
				"Failed to load secret schemas. Please reload the page.",
			);
		}
	}, [error]);

	return (
		<>
			<DropdownMenu.Root>
				<DropdownMenu.Trigger>
					<Button>
						Add Secret
						<DropdownMenu.TriggerIcon />
					</Button>
				</DropdownMenu.Trigger>

				<DropdownMenu.Content variant="soft">
					{secretsSchemas &&
						Object.keys(secretsSchemas).map((secretType) => (
							<DropdownMenu.Item
								onClick={() =>
									setDialogState({ open: true, secretType })
								}
							>
								<NamespaceIcon namespace={secretType} />{" "}
								{secretType}
							</DropdownMenu.Item>
						))}
					<DropdownMenu.Separator />

					<DropdownMenu.Item
						onClick={() =>
							setDialogState({ open: true, secretType: null })
						}
					>
						<PlusIcon /> Custom Secret
					</DropdownMenu.Item>
				</DropdownMenu.Content>
			</DropdownMenu.Root>

			<Dialog.Root
				open={dialogState.open}
				onOpenChange={(_) =>
					setDialogState({ ...dialogState, open: false })
				}
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
							>
								View documentation
							</a>
						</u>
						.
					</Dialog.Description>

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

						{/* TODO: */}
						<Button style={{ cursor: "pointer" }}>Save</Button>
					</Flex>
				</Dialog.Content>
			</Dialog.Root>
		</>
	);
}
