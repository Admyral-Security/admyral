"use client";

import { useQuery } from "@tanstack/react-query";
import z from "zod";
import api from "@/lib/api";
import { HTTPMethod } from "@/types/api";
import { AuditResult } from "@/types/audit";

const AUDIT_RESULTS_REFETCH_INTERVAL = 2000;

// GET /api/v1/policy/audit/results
const GetAuditResultsRequest = z.void();
const GetAuditResultsResponse = z.array(AuditResult);

const getAuditResultsApi = api<
	z.input<typeof GetAuditResultsRequest>,
	z.infer<typeof GetAuditResultsResponse>
>({
	method: HTTPMethod.GET,
	path: "/api/v1/policy/audit/results",
	requestSchema: GetAuditResultsRequest,
	responseSchema: GetAuditResultsResponse,
});

export const useGetAuditResults = () => {
	return useQuery({
		queryKey: ["get-audit-results"],
		queryFn: () => getAuditResultsApi(),
		refetchInterval: AUDIT_RESULTS_REFETCH_INTERVAL,
	});
};
