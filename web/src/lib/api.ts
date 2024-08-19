/*
Source: https://polvara.me/posts/effective-query-functions-for-react-query-with-zod/
*/
import type { z } from "zod";
import { apiCall } from "./api-call";
import { HTTPMethod } from "@/types/api";

export default function api<Request, Response>({
	method,
	path,
	requestSchema,
	responseSchema,
}: {
	method: HTTPMethod;
	path: string;
	requestSchema: z.ZodType<Request>;
	responseSchema: z.ZodType<Response>;
}): (data: Request) => Promise<Response> {
	return function (data: Request) {
		const parsedRequest = requestSchema.parse(data) as Request;

		const doApiCall = async () => {
			// We move the API call to the server-side since then the API base URL
			// can be an env. variable injected at runtime and not at buildtime.
			const responseData = await apiCall<Request, Response>(
				method,
				path,
				parsedRequest,
			);
			return responseSchema.parse(responseData) as Response;
		};

		return doApiCall();
	};
}
