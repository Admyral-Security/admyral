export const WORKFLOW_NAME_VALIDATION_ERROR_MESSAGE =
	"The workflow name must start with a letter. After the first letter, the name must only contain letters, numbers, and spaces.";

const WORKFLOW_NAME_REGEX = new RegExp("^[a-zA-Z][a-zA-Z0-9 ]*$");

export function isValidWorkflowName(name: string): boolean {
	return WORKFLOW_NAME_REGEX.test(name);
}
