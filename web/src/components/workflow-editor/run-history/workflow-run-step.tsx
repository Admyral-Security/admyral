import ErrorCallout from "@/components/utils/error-callout";
import { useGetWorkflowRunStepApi } from "@/hooks/use-get-workflow-run-step-api";
import { errorToast } from "@/lib/toast";
import { TJson } from "@/types/json";
import { Box, DataList, Flex, ScrollArea, Tabs, Text } from "@radix-ui/themes";
import { useEffect } from "react";
import { CodeBlock, a11yLight } from "react-code-blocks";

export default function WorkflowRunStep({
	workflowId,
	workflowRunId,
	workflowRunStepId,
}: {
	workflowId: string;
	workflowRunId: string;
	workflowRunStepId: string;
}) {
	const { data, isPending, error } = useGetWorkflowRunStepApi(
		workflowId,
		workflowRunId,
		workflowRunStepId,
	);

	useEffect(() => {
		if (error) {
			errorToast(
				"Failed to load workflow run step. Please reload the page.",
			);
		}
	}, [error]);

	if (isPending) {
		return (
			<Flex
				direction="column"
				height="100%"
				width="calc(100vw - 546px)"
				left="546px"
				style={{ position: "fixed" }}
			>
				<Text>Loading...</Text>
			</Flex>
		);
	}

	if (error) {
		return (
			<Flex
				direction="column"
				height="100%"
				width="calc(100vw - 546px)"
				left="546px"
				style={{ position: "fixed" }}
			>
				<ErrorCallout />
			</Flex>
		);
	}

	const inputArgs = data.inputArgs as Record<string, TJson>;

	return (
		<Flex
			direction="column"
			height="calc(100vh - 56px)"
			width="calc(100vw - 546px)"
			left="546px"
			style={{ position: "fixed" }}
		>
			<Box
				width="100%"
				height="54px"
				p="16px"
				className="border-b-2 border-b-gray-200"
			>
				<Text size="3" weight="medium">
					Trace to event {workflowRunStepId}
				</Text>
			</Box>

			<Flex direction="column" p="4" height="calc((100vh - 56px) / 2)">
				<Text>Input Arguments</Text>

				<ScrollArea
					type="hover"
					scrollbars="both"
					style={{
						height: "calc((100vh - 56px) / 2 - 80px)",
					}}
				>
					<Flex width="100%" p="4">
						{inputArgs !== null &&
						Object.keys(inputArgs).length > 0 ? (
							<DataList.Root>
								{Object.keys(inputArgs).map((inputArg, idx) => (
									<DataList.Item key={`input_arg_${idx}`}>
										<DataList.Label>
											<Text size="2">{inputArg}</Text>
										</DataList.Label>

										<DataList.Value>
											<Text size="2">
												{JSON.stringify(
													inputArgs[inputArg],
												)}
											</Text>
										</DataList.Value>
									</DataList.Item>
								))}
							</DataList.Root>
						) : (
							<Text size="2" color="gray">
								No input arguments.
							</Text>
						)}
					</Flex>
				</ScrollArea>
			</Flex>

			<Flex direction="column" p="4" height="calc((100vh - 56px) / 2)">
				<Tabs.Root defaultValue="result">
					<Tabs.List>
						<Tabs.Trigger value="result">Result</Tabs.Trigger>
						<Tabs.Trigger value="logs">Logs</Tabs.Trigger>
					</Tabs.List>

					<Tabs.Content value="result">
						<ScrollArea
							type="hover"
							scrollbars="both"
							style={{
								height: "calc((100vh - 56px) / 2 - 100px)",
								fontSize: "14px",
							}}
						>
							<CodeBlock
								text={JSON.stringify(data.result, null, 4)}
								language="json"
								showLineNumbers
								theme={a11yLight}
								customStyle={{
									overflow: "none",
								}}
							/>
						</ScrollArea>
					</Tabs.Content>

					<Tabs.Content value="logs">
						<ScrollArea
							type="hover"
							scrollbars="both"
							style={{
								height: "calc((100vh - 56px) / 2 - 100px)",
							}}
						>
							<Flex direction="column" width="100%">
								{data.logs !== null && data.logs.length > 0 ? (
									data.logs.split("\n").map((line, idx) => (
										<Text
											key={`log_line_${idx}`}
											size="2"
											color="gray"
										>
											{line}
										</Text>
									))
								) : (
									<Flex
										width="100%"
										height="100px"
										justify="center"
										align="center"
									>
										<Text color="gray" size="2">
											No logs produced.
										</Text>
									</Flex>
								)}
							</Flex>
						</ScrollArea>
					</Tabs.Content>
				</Tabs.Root>
			</Flex>
		</Flex>
	);
}
