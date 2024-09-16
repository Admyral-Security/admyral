import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
	const apiBaseUrl =
		process.env.ADMYRAL_API_BASE_URL || "http://127.0.0.1:8000";

	const url = `${apiBaseUrl}${req.nextUrl.pathname}${req.nextUrl.search}`;

	// Forward the request to the backend API
	const response = await fetch(url, {
		method: "POST",
		headers: req.headers,
		body: req.body,
		duplex: "half",
	} as RequestInit & { duplex?: string });

	// Return the response from the API
	return new Response(response.body, {
		status: response.status,
		headers: response.headers,
	});
}

export async function DELETE(req: NextRequest) {
	const apiBaseUrl =
		process.env.ADMYRAL_API_BASE_URL || "http://127.0.0.1:8000";

	const url = `${apiBaseUrl}${req.nextUrl.pathname}${req.nextUrl.search}`;

	// Forward the request to the backend API
	const response = await fetch(url, {
		method: "DELETE",
		headers: req.headers,
		body: req.body,
		duplex: "half",
	} as RequestInit & { duplex?: string });

	// Return the response from the API
	return new Response(response.body, {
		status: response.status,
		headers: response.headers,
	});
}

export async function GET(req: NextRequest) {
	const apiBaseUrl =
		process.env.ADMYRAL_API_BASE_URL || "http://127.0.0.1:8000";

	const url = `${apiBaseUrl}${req.nextUrl.pathname}${req.nextUrl.search}`;

	// Forward the request to the backend API
	const response = await fetch(url, {
		method: "GET",
		headers: req.headers,
	});

	// Return the response from the API
	return new Response(response.body, {
		status: response.status,
		headers: response.headers,
	});
}
