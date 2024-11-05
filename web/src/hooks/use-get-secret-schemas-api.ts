"use client";

import { useQuery } from "@tanstack/react-query";
import z from "zod";
import api from "@/lib/api";
import { HTTPMethod } from "@/types/api";

// GET /api/v1/secrets/schemas
const GetSecretsSchemasRequest = z.void();
const GetSecretsSchemasResponse = z.array(
	z.tuple([z.string(), z.array(z.string())]),
);

const getSecretsSchemasApi = api<
	z.input<typeof GetSecretsSchemasRequest>,
	z.infer<typeof GetSecretsSchemasResponse>
>({
	method: HTTPMethod.GET,
	path: "/api/v1/secrets/schemas",
	requestSchema: GetSecretsSchemasRequest,
	responseSchema: GetSecretsSchemasResponse,
});

export const useGetSecretsSchemas = () => {
	return useQuery({
		queryKey: ["secrets-schemas"],
		queryFn: () => getSecretsSchemasApi(),
	});
};
