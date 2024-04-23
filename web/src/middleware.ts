import { type NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

export async function middleware(request: NextRequest) {
	return await updateSession(request);
}

export const config = {
	matcher: [
		/*
		 * Match all request paths except for the ones starting with:
		 * - _next/static (static files)
		 * - _next/image (image optimization files)
		 * - favicon.ico (favicon file)
		 * Feel free to modify this pattern to include more paths.
		 *
		 * Additionally, excluding
		 * - /password/forgot*
		 * - /signup-success
		 * - /error
		 * - /login
		 * - /auth/confirm
		 * - /auth/callback
		 */
		"/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|auth/confirm|auth/callback|password/forgot*|error|login|signup-success).*)",
	],
};
