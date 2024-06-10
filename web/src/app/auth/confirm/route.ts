import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";

import { createClient } from "@/utils/supabase/server";

export async function GET(request: NextRequest) {
	const { searchParams } = new URL(request.url);
	const token_hash = searchParams.get("token_hash");
	const type = searchParams.get("type") as EmailOtpType | null;
	const next = searchParams.get("next") ?? "/";

	const redirectTo = request.nextUrl.clone();
	redirectTo.pathname = next;
	redirectTo.searchParams.delete("token_hash");
	redirectTo.searchParams.delete("type");

	if (token_hash && type) {
		const supabase = createClient();

		const { error } = await supabase.auth.verifyOtp({
			type,
			token_hash,
		});
		if (!error) {
			// Successful verification!
			redirectTo.searchParams.delete("next");
			// Since this is route for email confirmation, we know for sure that this is the first login
			redirectTo.searchParams.append("isFirstLogin", "true");
			return NextResponse.redirect(redirectTo);
		}
		console.log(
			`Error verifying OTP for URL \"${request.url}\": ${error.message}`,
		);
		redirectTo.searchParams.append("error", error.message);
	} else {
		console.log(
			`Error verifying OTP: Received an invalid confirmation link: ${redirectTo.toString()}`,
		);
		redirectTo.searchParams.append(
			"error",
			"Received an invalid confirmation link.",
		);
	}

	redirectTo.pathname = "/login";
	return NextResponse.redirect(redirectTo);
}
