"use client";

import { login, signup } from "./actions";
import { useState } from "react";
import Link from "next/link";
import {
	Button,
	Flex,
	Grid,
	Separator,
	Text,
	TextField,
} from "@radix-ui/themes";
import GoogleIcon from "@/components/icons/google-icon";
import GithubIcon from "@/components/icons/github-icon";
import LogoWithName from "@/components/icons/logo-with-name";
import { createClient } from "@/utils/supabase/client";
import Image from "next/image";

type OAuthProvider = "google" | "github" | "azure";

export default function LoginPage() {
	const supabase = createClient();

	const [isSignIn, setIsSignIn] = useState<boolean>(true);
	const [isLoading, setIsLoading] = useState<boolean>(false);

	const handleSubmit = async (event: any) => {
		event.preventDefault();

		setIsLoading(true);

		const formData = new FormData(event.currentTarget);
		if (isSignIn) {
			await login(formData);
		} else {
			await signup(formData);
		}
	};

	const handleOAuthLogin = async (provider: OAuthProvider) => {
		try {
			const { error } = await supabase.auth.signInWithOAuth({
				provider,
				options: {
					redirectTo: `${window.location.origin}/auth/callback`,
					// Offline access is required to refresh access tokens
					// https://supabase.com/docs/guides/auth/social-login/auth-azure#obtain-the-provider-refresh-token
					// scopes: "email offline_access",
				},
			});
			if (error) throw error;
		} catch (error) {
			alert(error);
		}
	};

	return (
		<Flex
			direction="column"
			justify="center"
			align="center"
			minHeight="100vh"
		>
			<Flex
				direction="column"
				justify="center"
				align="center"
				gap="4"
				minHeight="95vh"
			>
				<div className="sm:mx-auto sm:w-full sm:max-w-sm">
					<Flex justify="start" align="center">
						<LogoWithName />
					</Flex>
				</div>

				<div className="sm:mx-auto sm:w-full sm:max-w-sm">
					<ul className="flex flex-wrap -mb-px text-sm font-medium text-center text-gray-500 dark:text-gray-400">
						<li className="me-2">
							<button
								type="button"
								onClick={() => setIsSignIn(true)}
								disabled={isSignIn || isLoading}
								className={
									isSignIn
										? "inline-flex items-center justify-center p-4 text-blue-800 border-b-2 border-blue-800 rounded-t-lg active dark:text-blue-800 dark:border-blue-800 group"
										: "inline-flex items-center justify-center p-4 border-b-2 border-transparent rounded-t-lg hover:text-gray-600 hover:border-gray-300 dark:hover:text-gray-300 group"
								}
								aria-current={isSignIn ? "page" : undefined}
							>
								Log in
							</button>
						</li>
						<li className="me-2">
							<button
								type="button"
								onClick={() => setIsSignIn(false)}
								disabled={!isSignIn || isLoading}
								className={
									!isSignIn
										? "inline-flex items-center justify-center p-4 text-blue-800 border-b-2 border-blue-500 rounded-t-lg active dark:text-blue-800 dark:border-blue-800 group"
										: "inline-flex items-center justify-center p-4 border-b-2 border-transparent rounded-t-lg hover:text-gray-600 hover:border-gray-300 dark:hover:text-gray-300 group"
								}
								aria-current={!isSignIn ? "page" : undefined}
							>
								Sign up
							</button>
						</li>
					</ul>
				</div>

				<div className="sm:mx-auto sm:w-full sm:max-w-sm">
					<form className="space-y-4" onSubmit={handleSubmit}>
						<div>
							<label htmlFor="email">Business Email</label>
							<div className="mt-2">
								<TextField.Root
									size="3"
									variant="surface"
									id="email"
									name="email"
									type="email"
									required
								/>
							</div>
						</div>

						<div>
							<label htmlFor="password">Password</label>
							<div className="mt-2">
								<TextField.Root
									size="3"
									variant="surface"
									id="password"
									name="password"
									type="password"
									required
								/>
							</div>
						</div>

						<div>
							<Button
								type="submit"
								size="4"
								variant="solid"
								loading={isLoading}
								style={{ width: "100%", cursor: "pointer" }}
							>
								{isSignIn ? "Log in" : "Sign up"}
							</Button>
						</div>
					</form>
				</div>

				<div className="sm:mx-auto sm:w-full sm:max-w-sm hover:text-blue-800">
					<Link href="/password/forgot">Forgot password?</Link>
				</div>

				{(!!!process.env.NEXT_PUBLIC_DISABLE_GOOGLE_AUTH ||
					!!!process.env.NEXT_PUBLIC_DISABLE_MICROSOFT_AUTH ||
					!!!process.env.NEXT_PUBLIC_DISABLE_GITHUB_AUTH) && (
					<div className="sm:mx-auto sm:w-full sm:max-w-sm">
						<Grid columns="1fr 38px 1fr" justify="center">
							<Separator my="3" size="4" />
							<Flex justify="center" align="start">
								<Text
									size="4"
									style={{
										color: "var(--Neutral-color-Neutral-Alpha-6, rgba(1, 1, 46, 0.13))",
									}}
								>
									or
								</Text>
							</Flex>
							<Separator my="3" size="4" />
						</Grid>
					</div>
				)}

				{!!!process.env.NEXT_PUBLIC_DISABLE_GOOGLE_AUTH && (
					<div className="sm:mx-auto sm:w-full sm:max-w-sm">
						<Button
							style={{
								width: "100%",
								height: "auto",
								display: "flex",
								padding: "12px var(--Space-5, 24px)",
								alignItems: "center",
								justifyContent: "start",
								gap: "var(--Space-5, 24px)",
								alignSelf: "stretch",
								borderRadius: "var(--Radius-4, 8px)",
								border: "1px solid var(--Neutral-color-Neutral-5, #E4E4E9)",
								background: "var(--Panel-solid, #FFF)",
								boxShadow:
									"0px 0px 3px 0px rgba(0, 0, 0, 0.08), 0px 2px 3px 0px rgba(0, 0, 0, 0.17)",
								cursor: "pointer",
							}}
							onClick={() => handleOAuthLogin("google")}
						>
							<GoogleIcon />
							<Text
								size="4"
								style={{
									color: "var(--Tokens-Colors-text, #1C2024)",
								}}
							>
								Continue with Google
							</Text>
						</Button>
					</div>
				)}

				{!!!process.env.NEXT_PUBLIC_DISABLE_MICROSOFT_AUTH && (
					<div className="sm:mx-auto sm:w-full sm:max-w-sm">
						<Button
							style={{
								width: "100%",
								height: "auto",
								display: "flex",
								padding: "12px var(--Space-5, 24px)",
								alignItems: "center",
								justifyContent: "start",
								gap: "var(--Space-5, 24px)",
								alignSelf: "stretch",
								borderRadius: "var(--Radius-4, 8px)",
								border: "1px solid var(--Neutral-color-Neutral-5, #E4E4E9)",
								background: "var(--Panel-solid, #FFF)",
								boxShadow:
									"0px 0px 3px 0px rgba(0, 0, 0, 0.08), 0px 2px 3px 0px rgba(0, 0, 0, 0.17)",
								cursor: "pointer",
							}}
							onClick={() => handleOAuthLogin("azure")}
						>
							<Image
								src="/microsoft_logo.svg"
								alt="Microsoft"
								width={24}
								height={24}
							/>
							<Text
								size="4"
								style={{
									color: "var(--Tokens-Colors-text, #1C2024)",
								}}
							>
								Continue with Microsoft
							</Text>
						</Button>
					</div>
				)}

				{!!!process.env.NEXT_PUBLIC_DISABLE_GITHUB_AUTH && (
					<div className="sm:mx-auto sm:w-full sm:max-w-sm">
						<Button
							style={{
								width: "100%",
								height: "auto",
								display: "flex",
								padding: "12px var(--Space-5, 24px)",
								alignItems: "center",
								justifyContent: "start",
								gap: "var(--Space-5, 24px)",
								alignSelf: "stretch",
								borderRadius: "var(--Radius-4, 8px)",
								border: "1px solid var(--Neutral-color-Neutral-5, #E4E4E9)",
								background: "var(--Panel-solid, #FFF)",
								boxShadow:
									"0px 0px 3px 0px rgba(0, 0, 0, 0.08), 0px 2px 3px 0px rgba(0, 0, 0, 0.17)",
								cursor: "pointer",
							}}
							onClick={() => handleOAuthLogin("github")}
						>
							<GithubIcon />
							<Text
								size="4"
								style={{
									color: "var(--Tokens-Colors-text, #1C2024)",
								}}
							>
								Continue with GitHub
							</Text>
						</Button>
					</div>
				)}

				<div className="sm:mx-auto sm:w-full sm:max-w-sm">
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
				</div>
			</Flex>

			<Flex
				direction="column"
				justify="center"
				align="center"
				gap="4"
				minHeight="5vh"
			>
				<div className="sm:mx-auto sm:w-full sm:max-w-sm">
					<Flex gap="4">
						<Link href="/impressum">
							<Text size="2">Impressum</Text>
						</Link>
						<Link href="/dpa">
							<Text size="2">DPA</Text>
						</Link>
					</Flex>
				</div>
			</Flex>
		</Flex>
	);
}
