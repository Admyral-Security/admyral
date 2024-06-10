import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { User } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/signup-success", "/password/forgot"];

function isPublicPage(path: string): boolean {
	return (
		PUBLIC_PATHS.findIndex((publicPath) => path.startsWith(publicPath)) !==
		-1
	);
}

function isUserAuthenticated(user: User | null): boolean {
	return user !== null;
}

export async function updateSession(request: NextRequest) {
	let response = NextResponse.next({
		request: {
			headers: request.headers,
		},
	});

	const supabase = createServerClient(
		process.env.SUPABASE_URL_SERVER!,
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
		{
			cookies: {
				get(name: string) {
					return request.cookies.get(name)?.value;
				},
				set(name: string, value: string, options: CookieOptions) {
					request.cookies.set({
						name,
						value,
						...options,
					});
					response = NextResponse.next({
						request: {
							headers: request.headers,
						},
					});
					response.cookies.set({
						name,
						value,
						...options,
					});
				},
				remove(name: string, options: CookieOptions) {
					request.cookies.set({
						name,
						value: "",
						...options,
					});
					response = NextResponse.next({
						request: {
							headers: request.headers,
						},
					});
					response.cookies.set({
						name,
						value: "",
						...options,
					});
				},
			},
		},
	);

	// Refresh auth token
	const {
		data: { user },
	} = await supabase.auth.getUser();

	// If the user is not authenticated and wants to access a non-public page, we block access by redirecting to the login page
	if (!isUserAuthenticated(user) && !isPublicPage(request.nextUrl.pathname)) {
		return NextResponse.redirect(new URL("/login", request.url));
	}

	// If the user is authenticated and tries to access a public page, we redirect them to the home page
	if (isUserAuthenticated(user) && isPublicPage(request.nextUrl.pathname)) {
		return NextResponse.redirect(new URL("/", request.url));
	}

	return response;
}
