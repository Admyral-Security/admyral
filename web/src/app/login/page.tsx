"use client";

import { login, signup } from "./actions";
import { useState } from "react";
import Link from "next/link";
import { Button, Flex, Grid, Separator, Text } from "@radix-ui/themes";
import GoogleIcon from "@/components/icons/google-icon";
import GithubIcon from "@/components/icons/github-icon";
import LogoWithName from "@/components/icons/logo-with-name";
import { createClient } from "@/utils/supabase/client";

type OAuthProvider = "google" | "github";

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
				},
			});
			if (error) throw error;
		} catch (error) {
			alert(error);
		}
	};

	return (
		<div className="flex min-h-full flex-1 flex-col justify-center px-6 py-12 lg:px-8 gap-4">
			<div className="flex items-center justify-center flex-row gap-4">
				<LogoWithName />
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
							Sign in
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
							Register
						</button>
					</li>
				</ul>
			</div>

			<div className="sm:mx-auto sm:w-full sm:max-w-sm">
				<form className="space-y-4" onSubmit={handleSubmit}>
					<div>
						<label htmlFor="email">Email</label>
						<div className="mt-2">
							<input
								id="email"
								name="email"
								type="email"
								required
								className="block w-full rounded-md border-0 px-2 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-800 sm:text-sm sm:leading-6"
							/>
						</div>
					</div>

					<div>
						<label htmlFor="password">Password</label>
						<div className="mt-2">
							<input
								id="password"
								name="password"
								type="password"
								required
								className="block w-full rounded-md border-0 px-2 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-800 sm:text-sm sm:leading-6"
							/>
						</div>
					</div>

					<div>
						<button
							type="submit"
							className={`flex w-full items-center justify-center rounded-md bg-blue-800 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm ${isLoading ? "" : "hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-800"}`}
							disabled={isLoading}
						>
							{isLoading ? (
								<div className="flex flex-row items-center space-x-2">
									<span
										className="animate-spin inline-block w-4 h-4 border-[3px] border-current border-t-transparent text-white rounded-full"
										role="status"
										aria-label="loading"
									></span>
									<span>
										{isSignIn
											? "Signing in..."
											: "Registering..."}
									</span>
								</div>
							) : isSignIn ? (
								"Sign in"
							) : (
								"Register"
							)}
						</button>
					</div>
				</form>
			</div>

			<div className="sm:mx-auto sm:w-full sm:max-w-sm hover:text-blue-800">
				<Link href="/password/forgot">Forgot password?</Link>
			</div>

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
						{isSignIn
							? "Sign in with Google"
							: "Log in with Google"}
					</Text>
				</Button>
			</div>

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
						{isSignIn
							? "Sign in with GitHub"
							: "Log in with GitHub"}
					</Text>
				</Button>
			</div>
		</div>
	);
}
