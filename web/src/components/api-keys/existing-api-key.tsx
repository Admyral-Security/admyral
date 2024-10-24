"use client";

import { useDeleteApiKey } from "@/hooks/use-delete-api-key";
import { useApiKeysStore } from "@/stores/api-keys-store";
import { TApiKeyMetadata } from "@/types/api-key";
import { TrashIcon } from "@radix-ui/react-icons";
import { Flex, IconButton, Text, TextField } from "@radix-ui/themes";
import { useEffect } from "react";
import { useToast } from "@/providers/toast";

export default function ExistingApiKey({
	key,
	apiKey,
}: {
	key?: string;
	apiKey: TApiKeyMetadata;
}) {
	const { removeApiKey } = useApiKeysStore();
	const deleteApiKey = useDeleteApiKey();
	const handleDelete = () => deleteApiKey.mutate({ id: apiKey.id });
	const { errorToast } = useToast();

	useEffect(() => {
		if (deleteApiKey.isSuccess) {
			removeApiKey(apiKey.id);
		}
		if (deleteApiKey.isError) {
			errorToast(
				`Failed to delete API key ${apiKey.name}. Please try again.`,
			);
		}
		if (deleteApiKey.isSuccess || deleteApiKey.isError) {
			deleteApiKey.reset();
		}
	}, [deleteApiKey, removeApiKey, apiKey]);

	return (
		<Flex key={key} justify="between" align="end" gap="2">
			<Flex direction="column" gap="1" width="100%">
				<Text>API Key Name</Text>
				<TextField.Root disabled value={apiKey.name} />
			</Flex>

			<Flex>
				<IconButton
					variant="soft"
					color="red"
					style={{ cursor: "pointer" }}
					onClick={handleDelete}
				>
					<TrashIcon color="#ce2c31" />
				</IconButton>
			</Flex>
		</Flex>
	);
}
