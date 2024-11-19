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

export const PolicyControlMetadata = withCamelCaseTransform(
	z.object({
		control_id: z.string(),
		control_name: z.string(),
	}),
);
export type TPolicyControlMetadata = z.infer<typeof PolicyControlMetadata>;

export const PolicyControlWorkflows = withCamelCaseTransform(
	z.object({
		workflow_id: z.string(),
		workflow_name: z.string(),
	}),
);
export type TPolicyControlWorkflows = z.infer<typeof PolicyControlWorkflows>;

export const PolicyControl = withCamelCaseTransform(
	z.object({
		control: PolicyControlMetadata,
		workflows: z.array(PolicyControlWorkflows),
	}),
);
export type TPolicyControl = z.infer<typeof PolicyControl>;

export const PolicyWithControls = withCamelCaseTransform(
	z.object({
		policy: Policy,
		controls: z.array(PolicyControl),
	}),
);
export type TPolicyWithControls = z.infer<typeof PolicyWithControls>;
