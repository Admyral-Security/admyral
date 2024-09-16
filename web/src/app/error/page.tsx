"use client";

import LogoWithName from "@/components/icons/logo-with-name";
import { Code, Flex, Text } from "@radix-ui/themes";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

enum Error {
	Configuration = "Configuration",
	AccessDenied = "AccessDenied",
	Verification = "Verification",
}

const errorMap = {
	[Error.Configuration]: (
		<Text>
			There was a problem when trying to authenticate. Please contact us
			if this error persists. Unique error code:{" "}
			<Code>Configuration</Code>
		</Text>
	),
	[Error.AccessDenied]: <Text>The access was denied.</Text>,
	[Error.Verification]: <Text>The verification failed.</Text>,
};

function AuthError() {
	const search = useSearchParams();
	const error = search.get("error") as Error;

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
				<Link href="/">
					<LogoWithName />
				</Link>

				<Flex
					width="365px"
					justify="center"
					align="center"
					direction="column"
				>
					<Text size="4" weight="bold">
						Something went wrong
					</Text>
					<Text>
						{errorMap[error] ||
							"Please contact us if this error persists."}
					</Text>
				</Flex>
			</Flex>
		</Flex>
	);
}

export default function AuthErrorPage() {
	return (
		<Suspense fallback={null}>
			<AuthError />
		</Suspense>
	);
}
