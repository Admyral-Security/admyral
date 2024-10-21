"use client";

import { TSecretMetadata } from "@/types/secrets";
import { Flex, IconButton, Text, TextField } from "@radix-ui/themes";
import { useSecretsStore } from "@/stores/secrets-store";
import { useDeleteSecretApi } from "@/hooks/use-delete-secret-api";
import { useEffect } from "react";
import { useToast } from "@/providers/toast";
import { TrashIcon } from "@radix-ui/react-icons";

export default function EncryptedSecret({ idx }: { idx: number }) {
	const { errorToast } = useToast();
	const { secrets, removeSecret } = useSecretsStore();
	const deleteSecret = useDeleteSecretApi();

	const secret = secrets[idx] as TSecretMetadata;

	useEffect(() => {
		if (deleteSecret.isSuccess) {
			removeSecret(idx);
		}
		if (deleteSecret.isError) {
			errorToast(
				`Failed to delete secret ${secret.secretId}. Please try again.`,
			);
		}
		if (deleteSecret.isSuccess || deleteSecret.isError) {
			deleteSecret.reset();
		}
	}, [deleteSecret, removeSecret, idx, secret.secretId]);

	const handleDelete = () =>
		deleteSecret.mutate({ secretId: secret.secretId });

	return (
		<Flex direction="column" gap="1">
			<Flex width="100%" gap="2" align="end">
				<Flex direction="column" gap="1" width="100%">
					<Text>Secret Name</Text>
					<TextField.Root disabled value={secret.secretId} />
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

			{secret.secretSchema.map((key, idx) => (
				<Flex
					key={`encrypted_secret_${key}_${idx}`}
					justify="between"
					gap="1"
				>
					<Flex direction="column" gap="1" width="100%">
						<Text>Key</Text>
						<TextField.Root disabled value={key} />
					</Flex>

					<Flex direction="column" gap="1" width="100%">
						<Text>Value</Text>
						<TextField.Root
							disabled
							type="password"
							value="sdakjasdjkdasadssdasddasasddasa"
						/>
					</Flex>
				</Flex>
			))}
		</Flex>
	);
}
