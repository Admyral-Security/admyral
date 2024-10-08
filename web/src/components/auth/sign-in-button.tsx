"use client";

import { Button, Text } from "@radix-ui/themes";
import GithubIcon from "../icons/github-icon";
import { signIn } from "next-auth/react";
import GoogleIcon from "../icons/google-icon";
import { useState } from "react";

function ProviderIconMapping({ providerId }: { providerId: string }) {
	switch (providerId) {
		case "github":
			return <GithubIcon />;
		case "google":
			return <GoogleIcon />;
		default:
			return null;
	}
}

export interface SignInButtonProps {
	providerId: string;
	providerName: string;
}

export default function SignInButton({
	providerId,
	providerName,
}: SignInButtonProps) {
	const [isSigningIn, setIsSigningIn] = useState<boolean>(false);

	const handleSignIn = () => {
		setIsSigningIn(true);
		signIn(providerId, {
			callbackUrl: "/",
			redirect: false,
		}).catch((error) => {
			console.error(error);
			setIsSigningIn(false);
		});
	};

	return (
		<Button
			onClick={handleSignIn}
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
			loading={isSigningIn}
		>
			<ProviderIconMapping providerId={providerId} />
			<Text
				size="4"
				style={{
					color: "var(--Tokens-Colors-text, #1C2024)",
				}}
			>
				{`Continue with ${providerName}`}
			</Text>
		</Button>
	);
}
