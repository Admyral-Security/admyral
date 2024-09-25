"use client";

import { Button, Text } from "@radix-ui/themes";
// import { signIn } from "@/auth";
import GithubIcon from "../icons/github-icon";
// import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { useSession, signIn, signOut } from "next-auth/react";

function ProviderIconMapping({ providerId: string }: { providerId: string }) {
	return <GithubIcon />;
}

export interface SignInButtonProps {
	providerId: string;
	providerName: string;
}

export default function SignInButton({
	providerId,
	providerName,
}: SignInButtonProps) {
	return (
		<Button
			onClick={() =>
				signIn(providerId, {
					callbackUrl: "/",
				})
			}
			type="submit"
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
