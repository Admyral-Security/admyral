import authConfig from "./auth.config";
import NextAuth from "next-auth";
import { DISABLE_AUTH } from "./constants/env";

const { auth } = NextAuth(authConfig);
export default auth(async (req) => {
	if (DISABLE_AUTH) {
		return;
	}

	if (!req.auth && req.nextUrl.pathname.startsWith("/api/v1/")) {
		// Block requests from web to API service
		return Response.json(
			{ detail: "Missing authorization" },
			{ status: 401 },
		);
	}

	if (!req.auth && req.nextUrl.pathname !== "/login") {
		// If the user is not logged in, we always redirect to the login page.
		const newUrl = new URL("/login", req.nextUrl.origin);
		return Response.redirect(newUrl);
	}

	if (req.auth && req.nextUrl.pathname === "/login") {
		// If the user is logged in and tries to access the login page,
		// we always redirect to the workflow overview.
		const newUrl = new URL("/", req.nextUrl.origin);
		return Response.redirect(newUrl);
	}
});

// Whitelisted routes, i.e., no auth required
export const config = {
	matcher: [
		"/((?!api/auth|_next/static|_next/image|favicon.ico|error|terms-of-service|privacy-policy|dpa|impressum).*)",
	],
};
