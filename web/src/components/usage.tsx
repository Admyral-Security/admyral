"use client";

import { loadUserQuota } from "@/lib/api";
import { Quota } from "@/lib/types";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import { Box, Callout, Card, Flex, Text } from "@radix-ui/themes";
import { useEffect, useState } from "react";

export default function Usage() {
	const [error, setError] = useState<string | null>(null);
	const [quota, setQuota] = useState<Quota>({
		workflowRunsLastHour: 0,
		workflowRunHourlyQuota: undefined,
		workflowRunTimeoutInMinutes: undefined,
	});
	const [isLoaded, setIsLoaded] = useState<boolean>(false);

	useEffect(() => {
		loadUserQuota()
			.then((quota) => setQuota(quota))
			.catch((error) => {
				setError(
					`Failed to fetch user quota! If the problem persists, please contact us on Discord or via email ${process.env.NEXT_PUBLIC_SUPPORT_EMAIL}`,
				);
			})
			.finally(() => setIsLoaded(true));
	}, []);

	const noQuotaExists =
		quota.workflowRunHourlyQuota === undefined &&
		quota.workflowRunTimeoutInMinutes === undefined &&
		error === null;
	if (!isLoaded || noQuotaExists) {
		return <></>;
	}

	return (
		<Box width="50%">
			<Card size="3" variant="classic">
				<Flex direction="column" gap="5">
					<Flex justify="start">
						<Text size="4">Usage</Text>
					</Flex>

					{error && (
						<Callout.Root color="red">
							<Callout.Icon>
								<InfoCircledIcon />
							</Callout.Icon>
							<Callout.Text>{error}</Callout.Text>
						</Callout.Root>
					)}

					<Flex direction="column">
						<Text>
							For security reasons, there are usage limits in
							place:
						</Text>
						<Flex p="4">
							<ul className="list-disc">
								{quota.workflowRunTimeoutInMinutes !==
									undefined && (
									<li>
										<Text>
											{quota.workflowRunTimeoutInMinutes}{" "}
											min workflow timeout
										</Text>
									</li>
								)}
								{quota.workflowRunHourlyQuota !== undefined && (
									<li>
										<Text>
											{quota.workflowRunHourlyQuota}{" "}
											workflow executions per hour
										</Text>
									</li>
								)}
							</ul>
						</Flex>
					</Flex>

					<Flex>
						<Text>
							Send us a request to lift your limits via
							chris@admyral.dev or write us on Discord.
						</Text>
					</Flex>

					{quota.workflowRunHourlyQuota !== undefined && (
						<Callout.Root variant="surface" size="3" highContrast>
							<Callout.Icon>
								<InfoCircledIcon />
							</Callout.Icon>
							<Callout.Text size="3">
								{quota.workflowRunsLastHour} of{" "}
								{quota.workflowRunHourlyQuota} workflow
								executions in the last hour.
							</Callout.Text>
						</Callout.Root>
					)}
				</Flex>
			</Card>
		</Box>
	);
}
