"use client";

import { useQuery } from "@tanstack/react-query";
import z from "zod";
import api from "@/lib/api";
import { HTTPMethod } from "@/types/api";
import { PolicyMetadata } from "@/types/policy";

// GET /api/v1/policy
const ListPoliciesRequest = z.void();
const ListPoliciesResponse = z.array(PolicyMetadata);

const listPoliciesApi = api<
	z.input<typeof ListPoliciesRequest>,
	z.infer<typeof ListPoliciesResponse>
>({
	method: HTTPMethod.GET,
	path: "/api/v1/policy",
	requestSchema: ListPoliciesRequest,
	responseSchema: ListPoliciesResponse,
});

export const useListPolicies = () => {
	return useQuery({
		queryKey: ["list-policies"],
		queryFn: () => listPoliciesApi(),
	});
};
