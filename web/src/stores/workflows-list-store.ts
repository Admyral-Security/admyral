import { create } from "zustand";
import { produce } from "immer";
import { TWorkflowMetadata } from "@/types/workflows";

type WorkflowsListStoreState = {
	workflows: TWorkflowMetadata[];
	setWorkflows: (workflows: TWorkflowMetadata[]) => void;
	updateIsActiveState: (workflowId: string, newIsActive: boolean) => void;
};

export const useWorkflowsListStore = create<WorkflowsListStoreState>((set) => ({
	workflows: [],
	setWorkflows: (workflows) =>
		set({
			workflows,
		}),
	updateIsActiveState: (workflowId, newIsActive) =>
		set(
			produce((draft) => {
				const idx = draft.workflows.findIndex(
					(workflow: TWorkflowMetadata) =>
						workflow.workflowId === workflowId,
				);
				if (idx !== -1) {
					draft.workflows[idx].isActive = newIsActive;
				}
			}),
		),
}));
