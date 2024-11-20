import z from "zod";
import { withCamelCaseTransform } from "./utils";

export const Argument = withCamelCaseTransform(
	z.object({
		arg_name: z.string(),
		display_name: z.string(),
		description: z.string(),
		arg_type: z.string(),
		is_optional: z.boolean(),
		default_value: z.any().optional(),
	}),
);

export const ActionMetadata = withCamelCaseTransform(
	z.object({
		action_type: z.string(),
		display_name: z.string(),
		display_namespace: z.string(),
		description: z.string().nullable(),
		secrets_placeholders: z.array(z.string()),
		arguments: z.array(Argument),
	}),
);
export type TActionMetadata = z.infer<typeof ActionMetadata>;

export const ActionNamespace = withCamelCaseTransform(
	z.object({
		namespace: z.string(),
		actions: z.array(ActionMetadata),
	}),
);
export type TActionNamespace = z.infer<typeof ActionNamespace>;

export const EditorActions = withCamelCaseTransform(
	z.object({
		namespaces: z.array(ActionNamespace),
	}),
);
export type TEditorActions = z.infer<typeof EditorActions>;
