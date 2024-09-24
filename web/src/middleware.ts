import authConfig from "./auth.config";
import NextAuth from "next-auth";
import type { NextRequest } from "next/server";
import { DISABLE_AUTH } from "./constants/env";

const { auth } = NextAuth(authConfig);

export default auth(async (req) => {
	// console.log("MIDDLEWARE SESSION: ", session); /// FIXME:

	if (DISABLE_AUTH) {
		return;
	}

	console.log("MIDDLEWARE REQUEST AUTH: ", req); // FIXME:

	// const userRequest = await fetch("http://localhost:3000/api/user", {
	// 	cache: "no-store",
	// });
	// console.log("MIDDLEWARE USER: ", userRequest);

	// console.log("REQ AUTH: ", req.auth); // FIXME:
	// console.log("MIDDLEWARE req: ", req); // FIXME:

	if (!req.auth && req.nextUrl.pathname.startsWith("/api/v1/")) {
		// Block requests from web to API service
		return Response.json(
			{ detail: "Missing authorization" },
			{ status: 401 },
		);
	}

	if (!req.auth && !req.nextUrl.pathname.startsWith("/login")) {
		// If the user is not logged in, we always redirect to the login page.
		const newUrl = new URL("/login", req.nextUrl.origin);
		return Response.redirect(newUrl);
	}

	// const user = await fetch("/api/user");
	// console.log("USER IN MIDDLEWARE: ", user); // FIXME:

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
		"/((?!api/auth|api/user|_next/static|_next/image|favicon.ico|error|terms-of-service|privacy-policy|dpa|impressum).*)",
	],
};
