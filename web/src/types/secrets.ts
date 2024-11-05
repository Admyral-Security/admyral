import z from "zod";
import { withCamelCaseTransform } from "./utils";

export const SecretMetadata = withCamelCaseTransform(
	z.object({
		secret_id: z.string(),
		secret_schema: z.array(z.string()),
		email: z.string(),
		created_at: z.coerce.date(),
		updated_at: z.coerce.date(),
		secret_type: z.string().nullable(),
	}),
);
export type TSecretMetadata = z.infer<typeof SecretMetadata>;

export const Secret = z.object({
	secretId: z.string(),
	secret: z.array(
		z.object({
			key: z.string(),
			value: z.string(),
		}),
	),
	secretType: z.string().nullable(),
});
export type TSecret = z.infer<typeof Secret>;
