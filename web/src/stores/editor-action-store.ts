import { create } from "zustand";
import { TActionMetadata, TEditorActions } from "@/types/editor-actions";
import _ from "lodash";

function buildActionsIndex(
	editorActions: TEditorActions,
): Record<string, TActionMetadata> {
	return Object.fromEntries(
		_.flatten(
			editorActions.namespaces.map((namespace) =>
				namespace.actions.map((action) => [action.actionType, action]),
			),
		),
	);
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
