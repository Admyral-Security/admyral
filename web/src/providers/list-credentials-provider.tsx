"use client";

import { listCredentials } from "@/lib/api";
import { IntegrationType } from "@/lib/integrations";
import { errorToast } from "@/lib/toast";
import { createContext, useContext, useEffect, useState } from "react";

type ListCredentialsContextType = {
	credentials: string[] | null;
	setIntegrationTypeFilter: (integrationType: string | null) => void;
};

const ListCredentialsContext = createContext<ListCredentialsContextType>({
	credentials: null,
	setIntegrationTypeFilter: () => {},
});

interface ListCredentialsProps {
	children: React.ReactNode;
}

export function ListCredentialsProvider({ children }: ListCredentialsProps) {
	const [availableCredentials, setAvailableCredentials] = useState<
		string[] | null
	>(null);
	const [integrationTypeFilter, setIntegrationTypeFilter] = useState<
		string | null
	>(null);

	useEffect(() => {
		if (integrationTypeFilter === null) {
			setAvailableCredentials(null);
			return;
		}

		listCredentials(integrationTypeFilter as IntegrationType)
			.then((data) => {
				setAvailableCredentials(
					data.map((credential) => credential.name),
				);
			})
			.catch((error) => {
				errorToast("Failed to fetch credentials.");
			});
	}, [integrationTypeFilter]);

	return (
		<ListCredentialsContext.Provider
			value={{
				credentials: availableCredentials,
				setIntegrationTypeFilter,
			}}
		>
			{children}
		</ListCredentialsContext.Provider>
	);
}

export default function useListCredentials() {
	const context = useContext(ListCredentialsContext);
	if (context === undefined) {
		throw new Error(
			"useListCredentials must be used within a ListCredentialsProvider",
		);
	}
	return context;
}
