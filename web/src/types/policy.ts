import z from "zod";
import { withCamelCaseTransform } from "./utils";

export const PolicyMetadata = withCamelCaseTransform(
	z.object({
		id: z.string(),
		name: z.string(),
		approved_on: z.coerce.date(),
		last_updated: z.coerce.date(),
		version: z.string(),
		owner: z.string(),
	}),
);
export type TPolicyMetadata = z.infer<typeof PolicyMetadata>;

export const Policy = withCamelCaseTransform(
	z.object({
		id: z.string(),
		name: z.string(),
		approved_on: z.coerce.date(),
		last_updated: z.coerce.date(),
		version: z.string(),
		owner: z.string(),
		content: z.string(),
	}),
);
export type TPolicy = z.infer<typeof Policy>;
