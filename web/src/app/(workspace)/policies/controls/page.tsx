"use client";

import ErrorCallout from "@/components/utils/error-callout";
import { useListControls } from "@/hooks/use-list-controls";
import { Badge, Button } from "@radix-ui/themes";
import { Box, Flex, Table, Text } from "@radix-ui/themes";
import { useRouter } from "next/navigation";

export default function ControlsPage() {
	const { data: controls, isPending, error } = useListControls();
	const router = useRouter();

	if (isPending) {
		return <div>Loading...</div>;
	}

	if (error) {
		return <ErrorCallout />;
	}

	console.log(controls);

	return (
		<Flex direction="column" width="100%" height="100%" gap="4" p="4">
			<Flex justify="between" align="center">
				<Text size="3" weight="bold">
					Controls
				</Text>

				<Button size="2" variant="solid" style={{ cursor: "pointer" }}>
					Add Control
				</Button>
			</Flex>

			<Box width="100%" height="100%" mt="4">
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.ColumnHeaderCell>
								Control ID
							</Table.ColumnHeaderCell>
							<Table.ColumnHeaderCell>
								Name
							</Table.ColumnHeaderCell>
							<Table.ColumnHeaderCell>
								Description
							</Table.ColumnHeaderCell>
							<Table.ColumnHeaderCell>
								Frameworks
							</Table.ColumnHeaderCell>
						</Table.Row>
					</Table.Header>

					<Table.Body>
						{controls !== null &&
							controls.map((control, idx) => (
								<Table.Row
									key={control.control.id}
									className="hover:bg-gray-50 cursor-pointer"
									onClick={() => {
										router.push(
											`/control/${control.control.id}`,
										);
									}}
								>
									<Table.Cell>
										{control.control.id}
									</Table.Cell>
									<Table.Cell>
										{control.control.name}
									</Table.Cell>
									<Table.Cell>
										{control.control.description}
									</Table.Cell>
									<Table.Cell>
										{control.control.frameworks.map(
											(framework) => (
												<Badge
													key={`row_${idx}_${framework}`}
												>
													{framework}
												</Badge>
											),
										)}
									</Table.Cell>
								</Table.Row>
							))}
					</Table.Body>
				</Table.Root>
			</Box>
		</Flex>
	);
}
