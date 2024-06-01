import { NextResponse } from "next/server";
import {
	INTEGRATIONS,
	IntegrationType,
	MSTeamsOAuth,
} from "@/lib/integrations";
import { createCredential } from "@/lib/api";
import { cookies } from "next/headers";

// Note: this route is only accessible if the user is authenticated otherwise access is blocked

// Following https://learn.microsoft.com/en-us/graph/auth-v2-user?tabs=http#use-the-microsoft-authentication-library-msal
export async function GET(request: Request) {
	const { searchParams, origin } = new URL(request.url);

	if (searchParams.has("error")) {
		// Redirect to settings page with error message
		console.log(
			`Error in MS Teams OAuth callback: ${searchParams.get("error")} with description: ${searchParams.get("error_description")}`,
		);
		const errorMessage = `Failed to authenticate with Microsoft Teams. Please try again. If the problem persists, please reach out to us.`;
		return NextResponse.redirect(
			new URL(`/settings?error=${encodeURI(errorMessage)}`, request.url),
		);
	}

	const cookieStore = cookies();
	const expctedOAuthStateCookie = cookieStore.get("csrf-token");
	const expectedOAuthState = expctedOAuthStateCookie
		? expctedOAuthStateCookie.value
		: null;

	const code = searchParams.get("code");
	const state = searchParams.get("state");

	// Check whether the state parameter is the same as the one provided in the request.
	// Used to prevent Cross-Site Request Forgery (CSRF) attacks.
	if (expectedOAuthState === null || state !== expectedOAuthState) {
		// Failed to verify state challenge
		console.log("Invalid state parameter for MS Teams OAuth callback.");
		const errorMessage =
			"Failed to authenticate with Microsoft Teams. Please try again. If the problem persists, please reach out to us.";
		return NextResponse.redirect(
			new URL(`/settings?error=${encodeURI(errorMessage)}`, request.url),
		);
	}

	const clientId = process.env.NEXT_PUBLIC_MS_TEAMS_OAUTH_CLIENT_ID;
	const clientSecret = process.env.MS_TEAMS_OAUTH_CLIENT_SECRET;
	const redirectUri = `${process.env.NEXT_PUBLIC_DOMAIN}/integrations/callback/ms-teams`;

	if (!clientSecret || !clientId) {
		// MS Teams OAuth not configured correctly
		console.log(
			"MS Teams OAuth not configured correctly. Missing client secret or client ID.",
		);
		const errorMessage = `Failed to authenticate with Microsoft Teams due to a misconfiguration. Please contact support.`;
		return NextResponse.redirect(
			new URL(`/settings?error=${encodeURI(errorMessage)}`, request.url),
		);
	}

	// Request an access token
	const scope = (
		INTEGRATIONS[IntegrationType.MS_TEAMS].credential as MSTeamsOAuth
	).scope;
	const url = `https://login.microsoftonline.com/common/oauth2/v2.0/token?client_id=${clientId}&grant_type=authorization_code&scope=${encodeURI(scope)}&code=${code}&redirect_uri=${redirectUri}&client_secret=${clientSecret}`;

	const params = new URLSearchParams();
	params.append("client_id", clientId);
	params.append("grant_type", "authorization_code");
	params.append("scope", scope);
	params.append("code", code!);
	params.append("redirect_uri", redirectUri);
	params.append("client_secret", clientSecret);

	const currentTimestamp = Math.floor(Date.now() / 1000);

	const accessTokenResponse = await fetch(url, {
		method: "POST",
		headers: {
			"Content-type": "application/x-www-form-urlencoded",
		},
		body: params,
	});

	const accessTokenResponseData = await accessTokenResponse.json();

	const oauthToken = {
		access_token: accessTokenResponseData.access_token,
		refresh_token: accessTokenResponseData.refresh_token,
		expires_at: currentTimestamp + accessTokenResponseData.expires_in,
		token_type: accessTokenResponseData.token_type,
		scope: accessTokenResponseData.scope,
	};

	// Fetch user data to create credential name
	const microsoftUserData = await fetch(
		"https://graph.microsoft.com/v1.0/me",
		{
			method: "GET",
			headers: {
				Authorization: `${accessTokenResponseData.token_type} ${accessTokenResponseData.access_token}`,
			},
		},
	);
	const userJson = await microsoftUserData.json();

	// Store credentials
	const userMail = userJson.mail;

	try {
		await createCredential(
			userMail,
			JSON.stringify(oauthToken),
			IntegrationType.MS_TEAMS,
		);
	} catch (error) {
		console.error(
			"Failed to create credential for MS Teams OAuth. Error: ",
			error,
		);
		const errorMessage = `Failed to create credential for Microsoft Teams. Please try again. If the problem persists, please reach out to us.`;
		return NextResponse.redirect(
			new URL(`/settings?error=${encodeURI(errorMessage)}`, request.url),
		);
	}

	// Return the user to the settings page
	return NextResponse.redirect(new URL(`${origin}/settings`, request.url));
}
