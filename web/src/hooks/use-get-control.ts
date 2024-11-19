"use client";

import { useQuery } from "@tanstack/react-query";
import z from "zod";
import api from "@/lib/api";
import { HTTPMethod } from "@/types/api";
import { ControlDetails } from "@/types/controls";

// GET /api/v1/policy/control/{controlId}
const GetControlRequest = z.void();

export const useGetControl = (controlId: string) => {
	return useQuery({
		queryKey: ["get-control", controlId],
		queryFn: () =>
			api<
				z.input<typeof GetControlRequest>,
				z.input<typeof ControlDetails>
			>({
				method: HTTPMethod.GET,
				path: `/api/v1/policy/control/${controlId}`,
				requestSchema: GetControlRequest,
				responseSchema: ControlDetails,
			})(),
	});
};
