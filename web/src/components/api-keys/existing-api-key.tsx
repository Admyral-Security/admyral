"use client";

import { useDeleteApiKey } from "@/hooks/use-delete-api-key";
import { errorToast } from "@/lib/toast";
import { useApiKeysStore } from "@/stores/api-keys-store";
import { TApiKeyMetadata } from "@/types/api-key";
import { TrashIcon } from "@radix-ui/react-icons";
import { Flex, IconButton, Text, TextField } from "@radix-ui/themes";
import { useEffect } from "react";

export default function ExistingApiKey({
	apiKey,
}: {
	apiKey: TApiKeyMetadata;
}) {
	const { removeApiKey } = useApiKeysStore();
	const deleteApiKey = useDeleteApiKey();
	const handleDelete = () => deleteApiKey.mutate({ id: apiKey.id });

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
		<Flex justify="between" align="center">
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
