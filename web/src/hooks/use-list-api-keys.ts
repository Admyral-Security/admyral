"use client";

import { useQuery } from "@tanstack/react-query";
import z from "zod";
import api from "@/lib/api";
import { HTTPMethod } from "@/types/api";
import { ApiKeyMetadata } from "@/types/api-key";

// GET /api/v1/api-keys
const ListApiKeyRequest = z.void();
const ListApiKeyResponse = z.array(ApiKeyMetadata);

const listApiKeysApi = api<
	z.input<typeof ListApiKeyRequest>,
	z.infer<typeof ListApiKeyResponse>
>({
	method: HTTPMethod.POST,
	path: "/api/v1/api-keys",
	requestSchema: ListApiKeyRequest,
	responseSchema: ListApiKeyResponse,
});

export const useListApiKeys = () => {
	return useQuery({
		queryKey: ["list-api-keys"],
		queryFn: () => listApiKeysApi(),
	});
};
