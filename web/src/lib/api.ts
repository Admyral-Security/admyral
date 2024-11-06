/*
Source: https://polvara.me/posts/effective-query-functions-for-react-query-with-zod/
*/
import type { z } from "zod";
import zod from "zod";
import { HTTPMethod } from "@/types/api";

export class ApiError extends Error {
	constructor(
		public statusCode: number,
		public statusText: string,
	) {
		super(`API Error: ${statusCode} ${statusText}`);
		this.name = "ApiError";
	}
}

export class ValidationError extends Error {
	constructor(public errors: z.ZodError) {
		super("Validation Error");
		this.name = "ValidationError";
	}
}

export class NetworkError extends Error {
	constructor(public originalError: Error) {
		super("Network Error: " + originalError.message);
		this.name = "NetworkError";
	}
}

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
			try {
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

				let response;
				try {
					response = await fetch(apiPath, {
						method,
						body,
						headers: {
							"Content-Type": "application/json",
							Accept: "application/json",
						},
					});
				} catch (error) {
					throw new NetworkError(error as Error);
				}

				if (!response!.ok) {
					throw new ApiError(response.status, response.statusText);
				}

				const contentLength = response.headers.get("content-length");
				const responseData =
					contentLength && parseInt(contentLength, 10) > 0
						? await response.json()
						: await response.text();

				return responseSchema.parse(responseData) as Response;
			} catch (error) {
				// Re-throw validation errors
				if (error instanceof zod.ZodError) {
					throw new ValidationError(error);
				}

				if (
					error instanceof ApiError ||
					error instanceof NetworkError ||
					error instanceof ValidationError
				) {
					throw error;
				}

				throw new Error(
					`Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
				);
			}
		};

		return doApiCall();
	};
}
