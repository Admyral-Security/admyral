"use client";

import { Badge, Table, Flex, Box, Text, Button } from "@radix-ui/themes";
import * as Dialog from "@radix-ui/react-dialog";
import { Cross2Icon, MagicWandIcon, ReaderIcon } from "@radix-ui/react-icons";
import { useState } from "react";
import { Theme } from "@radix-ui/themes";
import { useRouter } from "next/navigation";
import { TAuditResultStatus, TAuditResult } from "@/types/audit";
function StatusBadge({ status }: { status: TAuditResultStatus }) {
	switch (status) {
		case "Passed":
			return <Badge color="green">Passed</Badge>;
		case "Failed":
			return <Badge color="red">Failed</Badge>;
		case "In Progress":
			return <Badge color="yellow">In Progress</Badge>;
		case "Not Audited":
			return <Badge color="gray">Not Audited</Badge>;
		case "Error":
			return <Badge color="red">Error</Badge>;
	}
}

export default function AuditDetails({
	auditResult,
}: {
	auditResult: TAuditResult;
}) {
	const router = useRouter();
	const [openDialog, setOpenDialog] = useState<boolean>(false);
	return (
		<>
			<Table.Row
				className="hover:bg-gray-50 cursor-pointer"
				onClick={() => setOpenDialog(true)}
			>
				<Table.Cell>{auditResult.id}</Table.Cell>
				<Table.Cell>
					<Flex width="80px" justify="start" align="center">
						<StatusBadge status={auditResult.status} />
					</Flex>
				</Table.Cell>
				<Table.Cell>{auditResult.description}</Table.Cell>
				<Table.Cell>{auditResult.category}</Table.Cell>
				<Table.Cell>
					{auditResult.lastAudit
						? new Date(auditResult.lastAudit).toLocaleString(
								"en-US",
							)
						: "N/A"}
				</Table.Cell>
			</Table.Row>

			<Dialog.Root
				open={openDialog}
				onOpenChange={(newOpenState) => setOpenDialog(newOpenState)}
			>
				<Dialog.Trigger asChild></Dialog.Trigger>

				<Dialog.Portal>
					<Dialog.Overlay className="fixed inset-0" />
					<Dialog.Content className="fixed border border-grey-200 top-4 bottom-4 right-4 h-[calc(100%-2rem)] w-[700px] bg-white shadow-lg transform transition-transform duration-300 ease-in-out p-6 overflow-y-auto rounded-lg">
						<Theme style={{ height: "100%" }}>
							<Flex
								direction="column"
								justify="between"
								height="100%"
								gap="4"
							>
								<Flex direction="column" gap="3">
									<Flex
										gap="4"
										justify="between"
										align="center"
									>
										<Dialog.Title className="text-xl font-bold">
											{auditResult.id} {auditResult.name}
										</Dialog.Title>
										<Dialog.Close className="rounded-full p-1.5 hover:bg-gray-100">
											<Cross2Icon />
										</Dialog.Close>
									</Flex>

									<Flex direction="column" gap="4">
										<Flex
											align="center"
											justify="start"
											gap="2"
										>
											<Text size="3" weight="medium">
												Status
											</Text>
											<StatusBadge
												status={auditResult.status}
											/>
										</Flex>

										<Flex direction="column" gap="2">
											<Text size="3" weight="medium">
												Gap Analysis
											</Text>
											<Text>
												{auditResult.gapAnalysis}
											</Text>
										</Flex>

										<Flex direction="column" gap="2">
											<Text size="3" weight="medium">
												Recommendation
											</Text>
											<Text>
												{auditResult.recommendation}
											</Text>
										</Flex>

										<Flex direction="column" gap="2">
											<Text size="3" weight="medium">
												Requirements Analysis
											</Text>
											{auditResult.pointOfFocusResults.map(
												(pof, index) => (
													<Flex
														key={index}
														className="p-4 border rounded"
														direction="column"
														gap="4"
													>
														<Flex
															direction="column"
															gap="1"
														>
															<Text
																size="3"
																weight="medium"
															>
																{index + 1}.{" "}
																{pof.name}
															</Text>
															<Text size="2">
																{
																	pof.description
																}
															</Text>
														</Flex>
														<Flex gap="2">
															<Text
																size="2"
																weight="medium"
															>
																Status
															</Text>
															<StatusBadge
																status={
																	pof.status
																}
															/>
														</Flex>

														<Flex
															direction="column"
															gap="1"
														>
															<Text
																size="2"
																weight="medium"
															>
																Gap Analysis
															</Text>
															<Text className="text-sm mb-2">
																{
																	pof.gapAnalysis
																}
															</Text>
														</Flex>

														<Flex
															direction="column"
															gap="1"
														>
															<Text
																size="2"
																weight="medium"
															>
																Recommendation
															</Text>
															<Text
																size="2"
																className="italic"
															>
																{
																	pof.recommendation
																}
															</Text>
														</Flex>
													</Flex>
												),
											)}
										</Flex>

										<Flex direction="column" gap="2">
											<Text size="3" weight="medium">
												Sources
											</Text>
											<Flex direction="column" gap="2">
												{auditResult.analyzedPolicies.map(
													(policy) => (
														<Box
															key={`analyzed_policy_${policy.id}`}
														>
															<Button
																variant="outline"
																style={{
																	cursor: "pointer",
																}}
																onClick={() =>
																	router.push(
																		`/policy/${policy.id}`,
																	)
																}
															>
																{policy.name}
															</Button>
														</Box>
													),
												)}
											</Flex>
										</Flex>
									</Flex>
								</Flex>

								<Flex justify="end" gap="4" pb="4">
									<Button style={{ cursor: "pointer" }}>
										<ReaderIcon /> Rerun Audit
									</Button>
									<Button
										variant="soft"
										style={{ cursor: "pointer" }}
									>
										<MagicWandIcon /> Apply Recommendation
									</Button>
								</Flex>
							</Flex>
						</Theme>
					</Dialog.Content>
				</Dialog.Portal>
			</Dialog.Root>
		</>
	);
}
