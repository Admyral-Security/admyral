"use client";

import { useQuery } from "@tanstack/react-query";
import z from "zod";
import api from "@/lib/api";
import { HTTPMethod } from "@/types/api";
import { Policy } from "@/types/policy";

// GET /api/v1/policy/id/{policy_id}
const GetPolicyRequest = z.void();

export const useGetPolicy = (policyId: string) => {
	return useQuery({
		queryKey: ["get-policies", policyId],
		queryFn: () =>
			api<z.input<typeof GetPolicyRequest>, z.infer<typeof Policy>>({
				method: HTTPMethod.GET,
				path: `/api/v1/policy/id/${policyId}`,
				requestSchema: GetPolicyRequest,
				responseSchema: Policy,
			})(),
	});
};
