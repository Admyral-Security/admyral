export function generateReferenceHandle(actionName: string): string {
	// TODO: make sure that reference handle is unique within a workflow
	return actionName.toLowerCase().replaceAll(" ", "_");
}
