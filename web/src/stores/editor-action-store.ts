import { create } from "zustand";
import { TActionMetadata, TEditorActions } from "@/types/editor-actions";

function buildActionsIndex(
	editorActions: TEditorActions,
): Record<string, TActionMetadata> {
	const index = {} as Record<string, TActionMetadata>;
	editorActions.controlFlowActions.forEach(
		(action) => (index[action.actionType] = action),
	);
	editorActions.namespaces.forEach((namespace) =>
		namespace.actions.forEach(
			(action) => (index[action.actionType] = action),
		),
	);
	return index;
}

type EditorActionStoreState = {
	editorActions: TEditorActions | null;
	actionsIndex: Record<string, TActionMetadata>;
	setEditorActions: (editorActions: TEditorActions) => void;
	queryActionByActionType: (
		actionType: string,
	) => TActionMetadata | undefined;
};

export const useEditorActionStore = create<EditorActionStoreState>(
	(set, get) => ({
		editorActions: null,
		actionsIndex: {},
		setEditorActions: (editorActions) =>
			set({
				editorActions,
				actionsIndex: buildActionsIndex(editorActions),
			}),
		queryActionByActionType: (actionType) => get().actionsIndex[actionType],
	}),
);
