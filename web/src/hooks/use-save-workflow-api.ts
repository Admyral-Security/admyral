"use client";

import { useMutation } from "@tanstack/react-query";
import z from "zod";
import api from "@/lib/api";
import {
	EditorWorkflowGraphSnakeCase,
	TEditorWorkflowGraph,
} from "@/types/react-flow";
import { withCamelCaseTransform } from "@/types/utils";
import { HTTPMethod } from "@/types/api";

// POST /editor/workflow
const SaveWorkflowResponse = withCamelCaseTransform(
	z.object({
		webhook_id: z.string().nullable(),
		webhook_secret: z.string().nullable(),
	}),
);

const saveWorkflow = api<
	z.input<typeof EditorWorkflowGraphSnakeCase>,
	z.infer<typeof SaveWorkflowResponse>
>({
	method: HTTPMethod.POST,
	path: "/api/v1/editor/workflow",
	requestSchema: EditorWorkflowGraphSnakeCase,
	responseSchema: SaveWorkflowResponse,
});

export const useSaveWorkflowApi = () => {
	return useMutation({
		mutationFn: (editorWorkflowGraph: TEditorWorkflowGraph) =>
			saveWorkflow(editorWorkflowGraph),
	});
};
