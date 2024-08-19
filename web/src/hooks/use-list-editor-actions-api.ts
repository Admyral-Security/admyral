"use client";

import { useQuery } from "@tanstack/react-query";
import z from "zod";
import api from "@/lib/api";
import { EditorActions } from "@/types/editor-actions";
import { HTTPMethod } from "@/types/api";

// GET /api/v1/editor/actions
const ListEditorActionsRequest = z.void();

const listEditorActions = api<
	z.infer<typeof ListEditorActionsRequest>,
	z.infer<typeof EditorActions>
>({
	method: HTTPMethod.GET,
	path: "/api/v1/editor/actions",
	requestSchema: ListEditorActionsRequest,
	responseSchema: EditorActions,
});

export const useListEditorActionsApi = () => {
	return useQuery({
		queryKey: ["editorActions"],
		queryFn: () => listEditorActions(),
	});
};
