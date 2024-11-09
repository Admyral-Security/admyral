import type { z } from "zod";

export class ApiError extends Error {
	constructor(
		public statusCode: number,
		public details: string,
	) {
		super(details);
		this.name = "ApiError";
		this.statusCode = statusCode;
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

export class WorkflowValidationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "WorkflowValidationError";
	}
}
