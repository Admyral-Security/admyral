"use client";

import { useMutation } from "@tanstack/react-query";
import z from "zod";
import api from "@/lib/api";
import { HTTPMethod } from "@/types/api";

// POST /api/v1/policy/audit/start
const StartAuditRequest = z.void();
const StartAuditResponse = z.null();

const startAuditApi = api<
	z.input<typeof StartAuditRequest>,
	z.infer<typeof StartAuditResponse>
>({
	method: HTTPMethod.POST,
	path: "/api/v1/policy/audit/start",
	requestSchema: StartAuditRequest,
	responseSchema: StartAuditResponse,
});

export const useStartAudit = () => {
	return useMutation({
		mutationFn: () => {
			return startAuditApi();
		},
	});
};
