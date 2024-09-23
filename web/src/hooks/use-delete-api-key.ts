"use client";

import { useMutation } from "@tanstack/react-query";
import z from "zod";
import api from "@/lib/api";
import { HTTPMethod } from "@/types/api";

// DELETE /api/v1/api-keys
const DeleteApiKeyRequest = z.void();
const DeleteApiKeyResponse = z.string().length(0);

export const useDeleteApiKey = () => {
	return useMutation({
		mutationFn: ({ id }: { id: string }) => {
			return api<
				z.infer<typeof DeleteApiKeyRequest>,
				z.infer<typeof DeleteApiKeyResponse>
			>({
				method: HTTPMethod.DELETE,
				path: `/api/v1/api-keys/${id}`,
				requestSchema: DeleteApiKeyRequest,
				responseSchema: DeleteApiKeyResponse,
			})();
		},
	});
};
