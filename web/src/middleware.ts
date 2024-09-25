import { getToken } from "next-auth/jwt";
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { getCurrentUser } from "./lib/session";

export default withAuth(
	async function middleware(req) {
		const token = await getToken({ req });
		const isAuthenticated = !!token;

		// const session = await getCurrentUser(); // FIXME:

		console.log("MIDDLEWARE: ", { req, token, isAuthenticated }); // FIXME:

		const isAuthPage = req.nextUrl.pathname.startsWith("/login");

		if (isAuthPage) {
			if (isAuthenticated) {
				return NextResponse.redirect(new URL("/", req.url));
			}
			return null;
		}

		if (!isAuthenticated) {
			return NextResponse.redirect(new URL(`/login`, req.url));
		}
	},
	{
		callbacks: {
			async authorized() {
				// This is a work-around for handling redirect on auth pages.
				// We return true here so that the middleware function above
				// is always called.
				return true;
			},
		},
	},
);

// Whitelisted routes, i.e., no auth required
export const config = {
	matcher: [
		"/((?!api/auth|_next/static|_next/image|favicon.ico|error|terms-of-service|privacy-policy|dpa|impressum).*)",
	],
};
