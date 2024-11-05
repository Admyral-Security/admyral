"use client";

import { useMutation } from "@tanstack/react-query";
import z from "zod";
import api from "@/lib/api";
import { withSnakeCaseTransform } from "@/types/utils";
import { SecretMetadata, TSecret } from "@/types/secrets";
import { HTTPMethod } from "@/types/api";

// POST /api/v1/secret/update
const UpdateSecretRequest = withSnakeCaseTransform(
	z.object({
		secretId: z.string(),
		secret: z.record(z.string(), z.string()),
		secretType: z.string().nullable(),
	}),
);

const updateSecret = api<
	z.input<typeof UpdateSecretRequest>,
	z.infer<typeof SecretMetadata>
>({
	method: HTTPMethod.POST,
	path: "/api/v1/secrets/update",
	requestSchema: UpdateSecretRequest,
	responseSchema: SecretMetadata,
});

export const useUpdateSecretApi = () => {
	return useMutation({
		mutationFn: ({ secretId, secret, secretType }: TSecret) => {
			return updateSecret({
				secretId,
				secret: Object.fromEntries(secret.map((s) => [s.key, s.value])),
				secretType,
			});
		},
	});
};
