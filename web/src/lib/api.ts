/*
Source: https://polvara.me/posts/effective-query-functions-for-react-query-with-zod/
*/
import type { z } from "zod";
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
			const apiPath =
				method === HTTPMethod.GET &&
				parsedRequest &&
				Object.keys(parsedRequest as object).length > 0
					? `${path}?${new URLSearchParams(parsedRequest as Record<string, string>)}`
					: path;
			const body =
				method === HTTPMethod.POST || method === HTTPMethod.DELETE
					? JSON.stringify(parsedRequest)
					: undefined;

			const response = await fetch(apiPath, {
				method,
				body,
				headers: {
					"Content-Type": "application/json",
					Accept: "application/json",
				},
			});
			const contentLength = response.headers.get("content-length");
			const responseData =
				contentLength && parseInt(contentLength, 10) > 0
					? await response.json()
					: "";

			return responseSchema.parse(responseData) as Response;
		};

		return doApiCall();
	};
}
