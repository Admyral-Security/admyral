"use client";

import AuditDetails from "@/components/audit/audit-details";
import ErrorCallout from "@/components/utils/error-callout";
import { useGetAuditResults } from "@/hooks/use-list-audit-results";
import { useStartAudit } from "@/hooks/use-start-audit";
import { useToast } from "@/providers/toast";
import { ReaderIcon } from "@radix-ui/react-icons";
import { Button, Flex, Select, Table, Text } from "@radix-ui/themes";

export default function PoliciesAuditPage() {
	const { data: auditResults, isPending, error } = useGetAuditResults();
	const startAudit = useStartAudit();
	const { successToast, errorToast } = useToast();

	if (isPending) {
		return <Text>Loading...</Text>;
	}

	if (error) {
		return <ErrorCallout />;
	}

	const handleStartAudit = async () => {
		try {
			await startAudit.mutateAsync();
			successToast("Audit started successfully.");
		} catch (error) {
			errorToast("Failed to start audit.");
		}
	};

	return (
		<Flex direction="column" width="100%" height="100%" gap="4" p="4">
			<Flex justify="between" align="center">
				<Text size="3" weight="bold">
					Audit Results
				</Text>

				<Flex gap="2" justify="center" align="center">
					<Text size="2" weight="bold">
						Framework
					</Text>
					<Select.Root defaultValue="SOC2">
						<Select.Trigger />
						<Select.Content>
							<Select.Item value="SOC2">SOC2</Select.Item>
						</Select.Content>
					</Select.Root>
					<Button
						style={{ cursor: "pointer" }}
						onClick={handleStartAudit}
					>
						<ReaderIcon />
						Run Audit
					</Button>
				</Flex>
			</Flex>

			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.ColumnHeaderCell style={{ width: "24px" }}>
							ID
						</Table.ColumnHeaderCell>
						<Table.ColumnHeaderCell style={{ width: "80px" }}>
							Status
						</Table.ColumnHeaderCell>
						<Table.ColumnHeaderCell style={{ width: "50%" }}>
							Description
						</Table.ColumnHeaderCell>
						<Table.ColumnHeaderCell style={{ width: "30%" }}>
							Category
						</Table.ColumnHeaderCell>
						<Table.ColumnHeaderCell style={{ width: "20%" }}>
							Last Audit
						</Table.ColumnHeaderCell>
					</Table.Row>
				</Table.Header>

				<Table.Body>
					{auditResults.map((auditResult) => (
						<AuditDetails
							key={auditResult.id}
							auditResult={auditResult}
						/>
					))}
				</Table.Body>
			</Table.Root>
		</Flex>
	);
}
