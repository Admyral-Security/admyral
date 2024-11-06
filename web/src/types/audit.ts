import z from "zod";
import { withCamelCaseTransform } from "./utils";

export const AuditResultStatus = z.enum([
	"Passed",
	"Failed",
	"In Progress",
	"Not Audited",
	"Error",
]);
export type TAuditResultStatus = z.infer<typeof AuditResultStatus>;

export const AuditAnalzyedPolicy = z.object({
	id: z.string(),
	name: z.string(),
});
export type TAuditAnalzyedPolicy = z.infer<typeof AuditAnalzyedPolicy>;

export const AuditPointOfFocusResult = withCamelCaseTransform(
	z.object({
		name: z.string(),
		description: z.string(),
		status: AuditResultStatus,
		gap_analysis: z.string(),
		recommendation: z.string(),
	}),
);
export type TAuditPointOfFocusResult = z.infer<typeof AuditPointOfFocusResult>;

export const AuditResult = withCamelCaseTransform(
	z.object({
		id: z.string(),
		name: z.string(),
		status: AuditResultStatus,
		description: z.string(),
		category: z.string(),
		last_audit: z.coerce.date().nullable(),
		gap_analysis: z.string(),
		recommendation: z.string(),
		point_of_focus_results: z.array(AuditPointOfFocusResult),
		analyzed_policies: z.array(AuditAnalzyedPolicy),
	}),
);
export type TAuditResult = z.infer<typeof AuditResult>;
