import z from "zod";
import { withCamelCaseTransform } from "./utils";

export const ApiKeyMetadata = withCamelCaseTransform(
	z.object({
		id: z.string(),
		name: z.string(),
		created_at: z.coerce.date(),
		user_email: z.string(),
	}),
);
export type TApiKeyMetadata = z.infer<typeof ApiKeyMetadata>;

export const ApiKey = z.object({
	key: ApiKeyMetadata,
	secret: z.string(),
});
export type TApiKey = z.infer<typeof ApiKey>;
