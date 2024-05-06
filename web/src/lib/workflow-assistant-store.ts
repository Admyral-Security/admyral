import { create } from "zustand";

type WorkflowAssistantState = {
	openAssistant: boolean;
	setOpenAssistant: (open: boolean) => void;
};

const useWorkflowAssistantStore = create<WorkflowAssistantState>((set) => ({
	openAssistant: false,
	setOpenAssistant: (open) => set({ openAssistant: open }),
}));

export default useWorkflowAssistantStore;
