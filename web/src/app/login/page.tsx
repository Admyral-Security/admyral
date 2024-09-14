import { providerMap } from "@/auth.config";
import SignInButton from "@/components/auth/sign-in-button";
import LogoWithName from "@/components/icons/logo-with-name";
import { DISABLE_AUTH } from "@/constants/env";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import { Box, Callout, Flex, Text } from "@radix-ui/themes";
import Link from "next/link";
import { redirect } from "next/navigation";

function ErrorMessage({ error }: { error: string | undefined }) {
	if (!error) return null;

	// Map AuthError types
	const errorMessages: { [key: string]: string } = {
		AccessDenied: "Access denied. You may not have permission to sign in.",
		AdapterError:
			"There was a problem with the database. Please try again later.",
		CallbackRouteError:
			"There was a problem during the authentication process. Please try again.",
		ErrorPageLoop:
			"There was a problem with the error page. Please contact support.",
		EventError: "An unexpected error occurred. Please try again.",
		InvalidCallbackUrl:
			"The callback URL is invalid. Please try signing in again.",
		CredentialsSignin:
			"Sign in failed. Please check your credentials and try again.",
		InvalidEndpoints:
			"There's a configuration issue. Please contact support.",
		InvalidCheck: "There's a configuration issue. Please contact support.",
		JWTSessionError:
			"There was a problem with your session. Please try signing in again.",
		MissingAdapter:
			"There's a configuration issue. Please contact support.",
		MissingAdapterMethods:
			"There's a configuration issue. Please contact support.",
		MissingAuthorize:
			"There's a configuration issue. Please contact support.",
		MissingSecret: "There's a configuration issue. Please contact support.",
		OAuthAccountNotLinked:
			"To confirm your identity, sign in with the same account you used originally.",
		OAuthCallbackError:
			"There was a problem with the OAuth callback. Please try again.",
		OAuthProfileParseError:
			"There was a problem retrieving your profile. Please try again.",
		SessionTokenError:
			"There was a problem with your session token. Please try signing in again.",
		OAuthSignInError:
			"There was a problem signing in with the OAuth provider. Please try again.",
		EmailSignInError:
			"There was a problem signing in with your email. Please try again.",
		SignOutError: "There was a problem signing out. Please try again.",
		UnknownAction: "An unknown action was requested. Please try again.",
		UnsupportedStrategy:
			"This sign-in method is not supported. Please try a different method.",
		InvalidProvider:
			"The selected provider is invalid. Please choose a different provider.",
		UntrustedHost:
			"The host is not trusted. Please ensure you're on the correct website.",
		Verification:
			"There was a problem verifying your account. Please try again.",
		MissingCSRF: "CSRF token is missing. Please try again.",
		AccountNotLinked:
			"This account is not linked. Please sign in with a linked account or link this account.",
		DuplicateConditionalUI:
			"There's a configuration issue. Please contact support.",
		MissingWebAuthnAutocomplete:
			"WebAuthn autocomplete is missing. Please ensure your browser supports WebAuthn.",
		WebAuthnVerificationError:
			"There was a problem verifying your WebAuthn credentials. Please try again.",
		ExperimentalFeatureNotEnabled:
			"This feature is experimental and not enabled. Please contact support.",
		default:
			"An unexpected error occurred. Please try again or contact support.",
	};

	const errorMessage = errorMessages[error] || errorMessages.default;

	return (
		<Callout.Root color="red">
			<Flex align="center" gap="5">
				<Callout.Icon>
					<InfoCircledIcon width="20" height="20" />
				</Callout.Icon>
				<Callout.Text size="2">Error: {errorMessage}</Callout.Text>
			</Flex>
		</Callout.Root>
	);
}

export default async function LoginPage({
	searchParams,
}: {
	searchParams?: { [key: string]: string | string[] | undefined };
}) {
	if (DISABLE_AUTH) {
		// TODO:
		redirect("/");
	}

	const error = searchParams?.error as string | undefined;

	return (
		<Flex
			width="100%"
			justify="center"
			align="center"
			direction="column"
			minHeight="100vh"
		>
			<Flex
				direction="column"
				minHeight="95vh"
				justify="center"
				align="center"
				gap="8"
			>
				<LogoWithName />

				<ErrorMessage error={error} />

				{providerMap.map((provider) => (
					<Box key={provider.id} width="365px">
						<SignInButton
							providerId={provider.id}
							providerName={provider.name}
						/>
					</Box>
				))}

				<Box width="365px">
					<Text size="2">
						By continuing you agree to our{" "}
						<Link href="/terms-of-service">
							<u>terms of service</u>
						</Link>{" "}
						and{" "}
						<Link href="/privacy-policy">
							<u>privacy policy</u>
						</Link>
						.
					</Text>
				</Box>
			</Flex>

			<Flex
				direction="column"
				justify="center"
				align="center"
				gap="4"
				minHeight="5vh"
			>
				<Flex gap="4">
					<Link href="/impressum">
						<Text size="2">Impressum</Text>
					</Link>
					<Link href="/dpa">
						<Text size="2">DPA</Text>
					</Link>
				</Flex>
			</Flex>
		</Flex>
	);
}
