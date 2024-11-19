import z from "zod";
import { withCamelCaseTransform, withSnakeCaseTransform } from "./utils";

export const Control = withCamelCaseTransform(
	z.object({
		id: z.string(),
		name: z.string(),
		description: z.string(),
		frameworks: z.array(z.string()),
	}),
);
export type TControl = z.infer<typeof Control>;

////////////////////////////////////////////////////////////////////////////////

const ControlToWorkflowConnection = withCamelCaseTransform(
	z.object({
		workflow_id: z.string(),
		workflow_name: z.string(),
	}),
);
export type TControlToWorkflowConnection = z.infer<
	typeof ControlToWorkflowConnection
>;

export const ControlDetails = withCamelCaseTransform(
	z.object({
		control: Control,
		workflows: z.array(ControlToWorkflowConnection),
	}),
);
export type TControlDetails = z.infer<typeof ControlDetails>;

////////////////////////////////////////////////////////////////////////////////

const ControlToWorkflowConectionSnakeCase = withSnakeCaseTransform(
	z.object({
		workflowId: z.string(),
		workflowName: z.string(),
	}),
);
export type TControlToWorkflowConnectionSnakeCase = z.infer<
	typeof ControlToWorkflowConectionSnakeCase
>;

export const ControlDetailsSnakeCase = z.object({
	control: Control,
	workflows: z.array(ControlToWorkflowConectionSnakeCase),
});
export type TControlDetailsSnakeCase = z.infer<typeof ControlDetailsSnakeCase>;
