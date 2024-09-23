"use client";

import { useMutation } from "@tanstack/react-query";
import z from "zod";
import api from "@/lib/api";
import { HTTPMethod } from "@/types/api";
import { ApiKey } from "@/types/api-key";

// POST /api/v1/api-keys
const CreateApiKeyRequest = z.object({
	name: z.string(),
});

const createApiKeyApi = api<
	z.input<typeof CreateApiKeyRequest>,
	z.infer<typeof ApiKey>
>({
	method: HTTPMethod.POST,
	path: "/api/v1/api-keys",
	requestSchema: CreateApiKeyRequest,
	responseSchema: ApiKey,
});

export const useCreateApiKey = () => {
	return useMutation({
		mutationFn: ({ name }: { name: string }) => {
			return createApiKeyApi({ name });
		},
	});
};
