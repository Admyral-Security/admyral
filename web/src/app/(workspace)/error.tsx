"use client";

import { useEffect } from "react";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import { Button, Callout, Flex } from "@radix-ui/themes";

export default function Error({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	useEffect(() => {
		// Optionally log the error to an error reporting service
		console.error(error);
	}, [error]);

	return (
		<Flex
			width="100%"
			height="100%"
			justify="center"
			align="center"
			direction="column"
			gap="5"
		>
			<Callout.Root color="red">
				<Flex align="center" gap="5">
					<Callout.Icon>
						<InfoCircledIcon width="20" height="20" />
					</Callout.Icon>
					<Callout.Text size="2">
						Oops, something went wrong. If the problem persists,
						please contact us on Discord or via email
						chris@adymral.dev
					</Callout.Text>
				</Flex>
			</Callout.Root>

			<Button
				variant="solid"
				style={{ cursor: "pointer" }}
				onClick={() => reset()}
			>
				Try again
			</Button>
		</Flex>
	);
}
