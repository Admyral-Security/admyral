import z from "zod";
import { withCamelCaseTransform } from "./utils";

const WorkflowMetadataBase = z.object({
	workflow_id: z.string(),
	workflow_name: z.string().nullable(),
	workflow_description: z.string().nullable(),
	controls: z.array(z.string()).nullable(),
	created_at: z.string(),
	is_active: z.boolean(),
});

export const WorkflowMetadata = withCamelCaseTransform(WorkflowMetadataBase);
export type TWorkflowMetadata = z.infer<typeof WorkflowMetadata>;
