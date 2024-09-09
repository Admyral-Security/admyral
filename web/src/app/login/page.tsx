import GithubSignIn from "@/components/auth/github-sign-in";
import LogoWithName from "@/components/icons/logo-with-name";
import { DISABLE_AUTH } from "@/constants/env";
import { Box, Card, Flex, Text } from "@radix-ui/themes";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function LoginPage() {
	if (DISABLE_AUTH) {
		// TODO:
		redirect("/");
	}

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

				<Box width="365px">
					<GithubSignIn />
				</Box>

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
