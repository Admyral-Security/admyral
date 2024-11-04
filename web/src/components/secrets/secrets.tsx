"use client";

import { useListSecretsApi } from "@/hooks/use-list-credentials-api";
import { DotsVerticalIcon, TrashIcon } from "@radix-ui/react-icons";
import { DropdownMenu, Flex, IconButton, Table } from "@radix-ui/themes";
import { useEffect } from "react";
import { useSecretsStore } from "@/stores/secrets-store";
import ErrorCallout from "../utils/error-callout";
import NamespaceIcon from "../workflow-editor/namespace-icon";
import Image from "next/image";
import { useDeleteSecretApi } from "@/hooks/use-delete-secret-api";
import { useToast } from "@/providers/toast";

export default function Secrets() {
	const {
		data: encryptedSecrets,
		isPending: isListingSecretsLoading,
		error: listingSecretsError,
	} = useListSecretsApi();
	const {
		secrets,
		setSecrets,
		getNumberOfSecrets,
		addNewSecret,
		clear,
		removeSecret,
	} = useSecretsStore();
	const deleteSecret = useDeleteSecretApi();
	const { errorToast } = useToast();

	const handleDeleteSecret = async (idx: number) => {
		try {
			await deleteSecret.mutateAsync({ secretId: secrets[idx].secretId });
			removeSecret(idx);
		} catch (error) {
			errorToast("Failed to delete secret. Please try again.");
		}
	};

	useEffect(() => {
		if (encryptedSecrets) {
			setSecrets(encryptedSecrets);
			return () => clear();
		}
	}, [encryptedSecrets, setSecrets, clear]);

	if (isListingSecretsLoading) {
		return null;
	}

	if (listingSecretsError) {
		return <ErrorCallout />;
	}

	return (
		<Table.Root>
			<Table.Header>
				<Table.Row>
					<Table.ColumnHeaderCell></Table.ColumnHeaderCell>
					<Table.ColumnHeaderCell>Name</Table.ColumnHeaderCell>
					<Table.ColumnHeaderCell>Updated</Table.ColumnHeaderCell>
					<Table.ColumnHeaderCell>Created</Table.ColumnHeaderCell>
					<Table.ColumnHeaderCell>Author</Table.ColumnHeaderCell>
					<Table.ColumnHeaderCell></Table.ColumnHeaderCell>
				</Table.Row>
			</Table.Header>

			<Table.Body>
				{secrets.map((secret, idx) => (
					<Table.Row>
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
						<Table.RowHeaderCell>
							{secret.secretId}
						</Table.RowHeaderCell>
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
											onClick={() =>
												handleDeleteSecret(idx)
											}
										>
											<TrashIcon />
											Delete
										</DropdownMenu.Item>
									</DropdownMenu.Content>
								</DropdownMenu.Root>
							</Flex>
						</Table.Cell>
					</Table.Row>
				))}
			</Table.Body>
		</Table.Root>
	);
}
