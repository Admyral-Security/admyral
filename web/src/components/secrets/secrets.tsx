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
	const { secrets, setSecrets, clearSecretsStore } = useSecretsStore();

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
		<Table.Root>
			<Table.Header>
				<Table.Row>
					<Table.ColumnHeaderCell
						style={{ width: "24px" }}
					></Table.ColumnHeaderCell>
					<Table.ColumnHeaderCell style={{ width: "30%" }}>
						Name
					</Table.ColumnHeaderCell>
					<Table.ColumnHeaderCell style={{ width: "15%" }}>
						Updated
					</Table.ColumnHeaderCell>
					<Table.ColumnHeaderCell style={{ width: "15%" }}>
						Created
					</Table.ColumnHeaderCell>
					<Table.ColumnHeaderCell style={{ width: "30%" }}>
						Author
					</Table.ColumnHeaderCell>
					<Table.ColumnHeaderCell
						style={{ width: "48px" }}
					></Table.ColumnHeaderCell>
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
