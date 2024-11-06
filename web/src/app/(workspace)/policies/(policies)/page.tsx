"use client";

import ErrorCallout from "@/components/utils/error-callout";
import { useListPolicies } from "@/hooks/use-list-policies";
import { Box, Button, Flex, Table, Text } from "@radix-ui/themes";
import { useRouter } from "next/navigation";

export default function PoliciesPage() {
	const router = useRouter();
	const { data: policies, isPending, error } = useListPolicies();

	if (isPending) {
		return <div>Loading...</div>;
	}

	if (error) {
		return <ErrorCallout />;
	}

	return (
		<Flex direction="column" width="100%" height="100%" gap="4" p="4">
			<Flex justify="between" align="center">
				<Text size="3" weight="bold">
					Policies
				</Text>

				<Button size="2" variant="solid" style={{ cursor: "pointer" }}>
					Create New Policy
				</Button>
			</Flex>

			<Box width="100%" height="100%" mt="4">
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.ColumnHeaderCell>
								Policy Name
							</Table.ColumnHeaderCell>
							<Table.ColumnHeaderCell>
								Approved On
							</Table.ColumnHeaderCell>
							<Table.ColumnHeaderCell>
								Last Updated
							</Table.ColumnHeaderCell>
							<Table.ColumnHeaderCell>
								Owner
							</Table.ColumnHeaderCell>
							<Table.ColumnHeaderCell>
								Version
							</Table.ColumnHeaderCell>
						</Table.Row>
					</Table.Header>

					<Table.Body>
						{policies.map((policy) => (
							<Table.Row
								key={policy.id}
								className="hover:bg-gray-50 cursor-pointer"
								onClick={() => {
									router.push(
										`/policies/policy/${policy.id}`,
									);
								}}
							>
								<Table.Cell>{policy.name}</Table.Cell>
								<Table.Cell>
									{policy.approvedOn.toLocaleString("en-US")}
								</Table.Cell>
								<Table.Cell>
									{policy.lastUpdated.toLocaleString("en-US")}
								</Table.Cell>
								<Table.Cell>{policy.owner}</Table.Cell>
								<Table.Cell>{policy.version}</Table.Cell>
							</Table.Row>
						))}
					</Table.Body>
				</Table.Root>
			</Box>
		</Flex>
	);
}
