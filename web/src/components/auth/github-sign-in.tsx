import { signIn } from "@/auth";
import { Button, Text } from "@radix-ui/themes";
import GithubIcon from "../icons/github-icon";
import { redirect } from "next/dist/server/api-utils";

export default function GithubSignIn() {
	return (
		<form
			action={async () => {
				"use server";
				await signIn("github", {
					redirectTo: "/",
				});
			}}
		>
			<Button
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
		</form>
	);
}
