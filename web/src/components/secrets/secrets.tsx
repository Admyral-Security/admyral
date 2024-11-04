"use client";

import { useListSecretsApi } from "@/hooks/use-list-credentials-api";
import { PlusIcon } from "@radix-ui/react-icons";
import { Box, Button, Card, Flex, Text } from "@radix-ui/themes";
import EncryptedSecret from "./encrypted-secret";
import NewSecret from "./new-secret";
import { useEffect } from "react";
import { useSecretsStore } from "@/stores/secrets-store";
import ErrorCallout from "../utils/error-callout";

export default function Secrets() {
	const {
		data: encryptedSecrets,
		isPending: isListingSecretsLoading,
		error: listingSecretsError,
	} = useListSecretsApi();
	const {
		setSecrets,
		getNumberOfSecrets,
		addNewSecret,
		isNewSecret,
		clearSecretsStore,
	} = useSecretsStore();

	useEffect(() => {
		if (encryptedSecrets) {
			setSecrets(encryptedSecrets);
			return () => clearSecretsStore();
		}
	}, [encryptedSecrets, setSecrets, clearSecretsStore]);

	if (isListingSecretsLoading) {
		return null;
	}

	if (listingSecretsError) {
		return <ErrorCallout />;
	}

	return (
		<Box width="50%">
			<Card size="3" variant="classic">
				<Flex direction="column" gap="5">
					<Flex justify="between">
						<Text size="4" weight="medium">
							Secrets
						</Text>

						<Button
							style={{
								cursor: "pointer",
							}}
							onClick={addNewSecret}
						>
							Add New Secret
							<PlusIcon />
						</Button>
					</Flex>

					{Array(getNumberOfSecrets())
						.fill(0)
						.map((_, idx) =>
							isNewSecret(idx) ? (
								<NewSecret
									key={`new_secret_${idx}`}
									idx={idx}
								/>
							) : (
								<EncryptedSecret
									key={`encrypted_secret_${idx}`}
									idx={idx}
								/>
							),
						)}
				</Flex>
			</Card>
		</Box>
	);
}
