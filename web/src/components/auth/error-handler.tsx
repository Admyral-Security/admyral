"use client";

import { InfoCircledIcon } from "@radix-ui/react-icons";
import { Callout, Flex } from "@radix-ui/themes";
import { useSearchParams } from "next/navigation";

const signInErrors = [
	{
		code: "OAuthAccountNotLinked",
		description:
			"Please sign in with the same provider that you used to create this account.",
	},
	{
		code: "Configuration",
		description:
			"There is a problem with the server configuration. Please contact support.",
	},
];

export default function AuthError() {
	const searchParams = useSearchParams();

	// handle NextAuth error codes: https://next-auth.js.org/configuration/pages#sign-in-page
	const error = searchParams.get("error");
	if (!error) {
		return null;
	}

	const defaultErrorDescription = `There was a problem signing you in. Please contact support if this is unexpected (error code: ${error})`;
	const errorDescription =
		signInErrors.find((e) => e.code === error)?.description ||
		defaultErrorDescription;
	// TODO: capture unexpected errors

	return (
		<Callout.Root color="red" style={{ width: "500px" }}>
			<Flex align="center" gap="5">
				<Callout.Icon>
					<InfoCircledIcon width="20" height="20" />
				</Callout.Icon>
				<Callout.Text size="2">{errorDescription}</Callout.Text>
			</Flex>
		</Callout.Root>
	);
}
