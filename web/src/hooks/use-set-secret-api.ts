"use client";

import { useMutation } from "@tanstack/react-query";
import z from "zod";
import api from "@/lib/api";
import { withSnakeCaseTransform } from "@/types/utils";
import { TSecret } from "@/types/secrets";
import { HTTPMethod } from "@/types/api";

// POST /api/v1/secret/set
const SetSecretRequest = withSnakeCaseTransform(
	z.object({
		secretId: z.string(),
		secret: z.record(z.string(), z.string()),
	}),
);
const SetSecretResponse = z.string().length(0);

const setSecret = api<
	z.input<typeof SetSecretRequest>,
	z.infer<typeof SetSecretResponse>
>({
	method: HTTPMethod.POST,
	path: "/api/v1/secrets/set",
	requestSchema: SetSecretRequest,
	responseSchema: SetSecretResponse,
});

export const useSetSecretApi = () => {
	return useMutation({
		mutationFn: ({ secret }: { secret: TSecret }) => {
			return setSecret({
				secretId: secret.secretId,
				secret: secret.secret.reduce(
					(prev, secret) => {
						prev[secret.key] = secret.value;
						return prev;
					},
					{} as Record<string, string>,
				),
			});
		},
	});
};
