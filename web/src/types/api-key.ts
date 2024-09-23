import z from "zod";

export const ApiKeyMetadata = z.object({
	id: z.string(),
	name: z.string(),
});
export type TApiKeyMetadata = z.infer<typeof ApiKeyMetadata>;

export const ApiKey = z.object({
	key: ApiKeyMetadata,
	secret: z.string(),
});
export type TApiKey = z.infer<typeof ApiKey>;
