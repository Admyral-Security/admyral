"use client";

import { useMutation } from "@tanstack/react-query";
import z from "zod";
import api from "@/lib/api";
import { withSnakeCaseTransform } from "@/types/utils";
import { SecretMetadata, TSecret } from "@/types/secrets";
import { HTTPMethod } from "@/types/api";

// POST /api/v1/secret/set
const SetSecretRequest = withSnakeCaseTransform(
	z.object({
		secretId: z.string(),
		secret: z.record(z.string(), z.string()),
		secretType: z.string().nullable(),
	}),
);

const setSecret = api<
	z.input<typeof SetSecretRequest>,
	z.infer<typeof SecretMetadata>
>({
	method: HTTPMethod.POST,
	path: "/api/v1/secrets/set",
	requestSchema: SetSecretRequest,
	responseSchema: SecretMetadata,
});

export const useSetSecretApi = () => {
	return useMutation({
		mutationFn: ({ secretId, secret, secretType }: TSecret) => {
			return setSecret({
				secretId,
				secret: Object.fromEntries(secret.map((s) => [s.key, s.value])),
				secretType,
			});
		},
	});
};
