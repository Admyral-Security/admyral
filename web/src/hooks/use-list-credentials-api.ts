"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import z from "zod";
import { SecretMetadata } from "@/types/secrets";
import { HTTPMethod } from "@/types/api";

// GET /api/v1/secrets/list
const ListSecretsRequest = z.void();
const ListSecretsResponse = z.array(SecretMetadata);

const listSecrets = api<
	z.input<typeof ListSecretsRequest>,
	z.output<typeof ListSecretsResponse>
>({
	method: HTTPMethod.GET,
	path: "/api/v1/secrets/list",
	requestSchema: ListSecretsRequest,
	responseSchema: ListSecretsResponse,
});

export const useListSecretsApi = () => {
	return useQuery({
		queryKey: ["listSecrets"],
		queryFn: () => listSecrets(),
	});
};
