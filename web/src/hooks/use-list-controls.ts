"use client";

import { useQuery } from "@tanstack/react-query";
import z from "zod";
import api from "@/lib/api";
import { HTTPMethod } from "@/types/api";
import { ControlDetails } from "@/types/controls";

// GET /api/v1/policy/controls
const ListControlsRequest = z.void();
const ListControlsResponse = z.array(ControlDetails);

const listControlsApi = api<
	z.input<typeof ListControlsRequest>,
	z.infer<typeof ListControlsResponse>
>({
	method: HTTPMethod.GET,
	path: "/api/v1/policy/controls",
	requestSchema: ListControlsRequest,
	responseSchema: ListControlsResponse,
});

export const useListControls = () => {
	return useQuery({
		queryKey: ["list-controls"],
		queryFn: () => listControlsApi(),
	});
};
