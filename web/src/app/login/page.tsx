import SignInButton from "@/components/auth/sign-in-button";
import LogoWithName from "@/components/icons/logo-with-name";
import { providerMap } from "@/lib/auth";
import { isAuthDisabled } from "@/lib/env";
import { Box, Flex, Text } from "@radix-ui/themes";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function LoginPage() {
	const disableAuth = await isAuthDisabled();
	if (disableAuth) {
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
				gap="4"
			>
				<LogoWithName />

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
