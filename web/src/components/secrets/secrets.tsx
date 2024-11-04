"use client";

import { useListSecretsApi } from "@/hooks/use-list-credentials-api";
import { Table } from "@radix-ui/themes";
import { useEffect } from "react";
import { useSecretsStore } from "@/stores/secrets-store";
import ErrorCallout from "../utils/error-callout";
import SecretRow from "./secret-row";

export default function Secrets() {
	const {
		data: encryptedSecrets,
		isPending: isListingSecretsLoading,
		error: listingSecretsError,
	} = useListSecretsApi();
	const { secrets, setSecrets, clear } = useSecretsStore();

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
					<SecretRow
						key={`secret_row_${secret.secretId}`}
						secret={secret}
						idx={idx}
					/>
				))}
			</Table.Body>
		</Table.Root>
	);
}
