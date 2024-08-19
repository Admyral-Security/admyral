import z from "zod";
import { withCamelCaseTransform } from "./utils";

export const SecretMetadata = withCamelCaseTransform(
	z.object({
		secret_id: z.string(),
		secret_schema: z.array(z.string()),
	}),
);
export type TSecretMetadata = z.infer<typeof SecretMetadata>;

const SecretMetadataCamelCase = z.object({
	secretId: z.string(),
	secret_schema: z.array(z.string()),
});

export function isSecretMetadata(obj: any): boolean {
	return SecretMetadataCamelCase.safeParse(obj).success;
}

export const Secret = z.object({
	secretId: z.string(),
	secret: z.array(
		z.object({
			key: z.string(),
			value: z.string(),
		}),
	),
});
export type TSecret = z.infer<typeof Secret>;
