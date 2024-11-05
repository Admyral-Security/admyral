"use client";

import { DropdownMenu, Flex, IconButton, Table } from "@radix-ui/themes";
import { useEffect, useState } from "react";
import ErrorCallout from "../utils/error-callout";
import { useListApiKeys } from "@/hooks/use-list-api-keys";
import { useApiKeysStore } from "@/stores/api-keys-store";
import { DotsVerticalIcon, TrashIcon } from "@radix-ui/react-icons";
import { useDeleteApiKey } from "@/hooks/use-delete-api-key";
import { useToast } from "@/providers/toast";

interface DeleteApiKeyProps {
	apiKeyId: string;
}

function DeleteApiKey({ apiKeyId }: DeleteApiKeyProps) {
	const deleteApiKey = useDeleteApiKey();
	const { errorToast } = useToast();
	const { removeApiKey } = useApiKeysStore();
	const [isDeleting, setIsDeleting] = useState<boolean>(false);

	const handleDeleteApiKey = async () => {
		try {
			setIsDeleting(true);
			await deleteApiKey.mutateAsync({ id: apiKeyId });
			removeApiKey(apiKeyId);
		} catch (error) {
			errorToast("Failed to delete API key. Please try again.");
		} finally {
			setIsDeleting(false);
		}
	};

	return (
		<DropdownMenu.Item disabled={isDeleting} onClick={handleDeleteApiKey}>
			<TrashIcon />
			Delete
		</DropdownMenu.Item>
	);
}

export default function ApiKeys() {
	const { data, isPending, error } = useListApiKeys();
	const { apiKeys, setApiKeys, clear, removeApiKey } = useApiKeysStore();

	useEffect(() => {
		if (data) {
			setApiKeys(data);
			return () => clear();
		}
	}, [data, setApiKeys, clear]);

	if (isPending) {
		return null;
	}

	if (error) {
		return <ErrorCallout />;
	}

	return (
		<Table.Root>
			<Table.Header>
				<Table.Row>
					<Table.ColumnHeaderCell>Key Name</Table.ColumnHeaderCell>
					<Table.ColumnHeaderCell>Created</Table.ColumnHeaderCell>
					<Table.ColumnHeaderCell>Author</Table.ColumnHeaderCell>
					<Table.ColumnHeaderCell></Table.ColumnHeaderCell>
				</Table.Row>
			</Table.Header>

			<Table.Body>
				{apiKeys.map((apiKey, idx) => (
					<Table.Row key={`api_key_row_${apiKey.name}_${idx}`}>
						<Table.RowHeaderCell>{apiKey.name}</Table.RowHeaderCell>
						<Table.Cell>
							{apiKey.createdAt.toLocaleString("en-US")}
						</Table.Cell>
						<Table.Cell>{apiKey.userEmail}</Table.Cell>
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
										<DeleteApiKey apiKeyId={apiKey.id} />
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
