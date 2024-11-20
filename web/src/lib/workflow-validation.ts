export const WORKFLOW_NAME_VALIDATION_ERROR_MESSAGE =
	"The workflow name must start with a letter. After the first letter, the name must only contain letters, numbers, underscores, and spaces.";

const WORKFLOW_NAME_REGEX = new RegExp("^[a-zA-Z][a-zA-Z0-9 _]*$");
const SNAKE_CASE_REGEX = new RegExp("^[a-zA-Z][a-zA-Z0-9_]*$");

export function isValidWorkflowName(name: string): boolean {
	return WORKFLOW_NAME_REGEX.test(name);
}

export function isValidResultName(name: string): boolean {
	return name.length == 0 || SNAKE_CASE_REGEX.test(name);
}
