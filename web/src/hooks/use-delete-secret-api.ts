"use client";

import { useMutation } from "@tanstack/react-query";
import z from "zod";
import api from "@/lib/api";
import { withSnakeCaseTransform } from "@/types/utils";
import { HTTPMethod } from "@/types/api";

// DELETE /api/v1/secret/delete
const DeleteSecretRequest = withSnakeCaseTransform(
	z.object({
		secretId: z.string(),
	}),
);
const DeleteSecretResponse = z.string().length(0);

const deleteSecret = api<
	z.input<typeof DeleteSecretRequest>,
	z.infer<typeof DeleteSecretResponse>
>({
	method: HTTPMethod.DELETE,
	path: `/api/v1/secrets/delete`,
	requestSchema: DeleteSecretRequest,
	responseSchema: DeleteSecretResponse,
});

export const useDeleteSecretApi = () => {
	return useMutation({
		mutationFn: ({ secretId }: { secretId: string }) => {
			return deleteSecret({ secretId });
		},
	});
};
