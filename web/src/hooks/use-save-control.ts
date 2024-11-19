"use client";

import { useMutation } from "@tanstack/react-query";
import z from "zod";
import api from "@/lib/api";
import { HTTPMethod } from "@/types/api";
import { ControlDetailsSnakeCase, TControlDetails } from "@/types/controls";

// POST /editor/workflow
const SaveControlResponse = z.string().length(0);

export const useSaveControl = (controlId: string) => {
	return useMutation({
		mutationFn: (controlDetails: TControlDetails) =>
			api<
				z.input<typeof ControlDetailsSnakeCase>,
				z.input<typeof SaveControlResponse>
			>({
				method: HTTPMethod.POST,
				path: `/api/v1/policy/control/${controlId}`,
				requestSchema: ControlDetailsSnakeCase,
				responseSchema: SaveControlResponse,
			})(controlDetails),
	});
};
