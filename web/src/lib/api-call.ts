"use client";

import { HTTPMethod } from "@/types/api";

export async function apiCall<Request, Response>(
	method: HTTPMethod,
	path: string,
	requestData: Request,
): Promise<Response> {
	const apiPath =
		method === HTTPMethod.GET &&
		requestData &&
		Object.keys(requestData as object).length > 0
			? `${path}?${new URLSearchParams(requestData as Record<string, string>)}`
			: path;
	const body =
		method === HTTPMethod.POST ? JSON.stringify(requestData) : undefined;

	const response = await fetch(apiPath, {
		method,
		body,
		headers: {
			"Content-Type": "application/json",
			Accept: "application/json",
		},
	});

	return await response.json();
}
