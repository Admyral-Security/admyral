import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(request: Request) {
	const { searchParams, origin } = new URL(request.url);
	const code = searchParams.get("code");
	// if "next" is in param, use it as the redirect URL
	const next = searchParams.get("next") ?? "/";

	if (!code) {
		return NextResponse.redirect(
			`${origin}/login?error=Someting went wrong. Please try again.`,
		);
	}

	const supabase = createClient();
	const {
		data: { user },
		error,
	} = await supabase.auth.exchangeCodeForSession(code);
	if (error) {
		console.log(
			`Error exchanging code for session during OAuth login: ${error.message}`,
		);
		return NextResponse.redirect(`${origin}/login?error=${error.message}`);
	}

	// We classify a user as first login if they have confirmed their email within the last 5 minutes
	const emailConfirmedAtTimestamp =
		user && user.email_confirmed_at
			? Math.floor(new Date(user.email_confirmed_at).getTime())
			: 0;
	const isFirstLogin =
		user &&
		user.email_confirmed_at &&
		emailConfirmedAtTimestamp + 60 * 1000 >= Date.now();
	if (isFirstLogin) {
		return NextResponse.redirect(`${origin}${next}?isFirstLogin=true`);
	}

	return NextResponse.redirect(`${origin}${next}`);
}
