"use client";

import BackIcon from "@/components/icons/back-icon";
import ErrorCallout from "@/components/utils/error-callout";
import { useGetPolicy } from "@/hooks/use-get-policy";
import * as Collapsible from "@radix-ui/react-collapsible";
import { useCopilotReadable } from "@copilotkit/react-core";
import { CopilotChat } from "@copilotkit/react-ui";
import {
	CalendarIcon,
	ChevronRightIcon,
	MinusIcon,
	Pencil1Icon,
} from "@radix-ui/react-icons";
import {
	Box,
	Button,
	ChevronDownIcon,
	Flex,
	Grid,
	IconButton,
	Link,
	Select,
	Text,
	TextField,
	ScrollArea,
	Dialog,
} from "@radix-ui/themes";
import MDEditor from "@uiw/react-md-editor";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { TPolicyControl, TPolicyWithControls } from "@/types/policy";
import { useImmer } from "use-immer";
import { useListControls } from "@/hooks/use-list-controls";
import { TControlDetails } from "@/types/controls";

const SYSTEM_INSTRUCTIONS =
	"You are a helpful assistant with expert knowledge in security compliance (e.g., SOC2, ISO27001, PCI-DSS). Answer in the best way possible given the data you have. You have access to a security policy. Answer questions about the policy truthfully.";

const Control = ({ control }: { control: TPolicyControl }) => {
	const [open, setOpen] = useState(false);

	return (
		<Collapsible.Root open={open} onOpenChange={setOpen}>
			<Flex direction="column" gap="2" pr="4">
				<Flex justify="between" align="center">
					<Text size="2">
						<Link href={`/policies/controls`}>
							{control.control.controlId}
						</Link>{" "}
						{control.control.controlName}
					</Text>
					<Collapsible.Trigger>
						<IconButton
							style={{
								cursor: "pointer",
								height: "24px",
								width: "24px",
							}}
							variant="ghost"
							size="1"
						>
							{open ? <ChevronDownIcon /> : <ChevronRightIcon />}
						</IconButton>
					</Collapsible.Trigger>
				</Flex>

				{control.workflows && control.workflows.length > 0 && (
					<Collapsible.Content>
						<Flex direction="column" gap="2">
							{control.workflows.map((workflow) => (
								<Link
									size="2"
									href={`/editor/${workflow.workflowId}`}
								>
									{workflow.workflowName}
								</Link>
							))}
						</Flex>
					</Collapsible.Content>
				)}
			</Flex>
		</Collapsible.Root>
	);
};

const EditControls = ({
	mappedControls,
	controls,
	addControl,
	removeControl,
}: {
	mappedControls: TPolicyControl[];
	controls: TControlDetails[];
	addControl: (control: TPolicyControl) => void;
	removeControl: (idx: number) => void;
}) => {
	const [selectedControlId, setSelectedControlId] = useState<
		string | undefined
	>(undefined);

	return (
		<Dialog.Root>
			<Dialog.Trigger>
				<Button variant="ghost" size="1" style={{ cursor: "pointer" }}>
					<Pencil1Icon />
					Edit
				</Button>
			</Dialog.Trigger>

			<Dialog.Content>
				<Dialog.Title>Edit Control Mapping</Dialog.Title>

				<Flex direction="column" gap="4">
					<Flex direction="column" gap="3">
						{mappedControls.map((mappedControl, idx) => (
							<Flex key={mappedControl.control.controlId} gap="2">
								<Text>{mappedControl.control.controlName}</Text>

								<IconButton
									variant="soft"
									color="red"
									style={{ cursor: "pointer" }}
									size="1"
									onClick={() => removeControl(idx)}
								>
									<MinusIcon />
								</IconButton>
							</Flex>
						))}

						<Flex gap="2">
							<Select.Root
								value={selectedControlId}
								onValueChange={setSelectedControlId}
							>
								<Select.Trigger placeholder="Select Control" />
								<Select.Content>
									{controls.map((control) => (
										<Select.Item value={control.control.id}>
											{control.control.name}
										</Select.Item>
									))}
								</Select.Content>
							</Select.Root>

							<Button
								style={{ cursor: "pointer" }}
								onClick={() => {
									const idx = controls.findIndex(
										(control) =>
											control.control.id ===
											selectedControlId,
									);
									addControl({
										control: {
											controlId: controls[idx].control.id,
											controlName:
												controls[idx].control.name,
										},
										workflows: controls[idx].workflows,
									});
									setSelectedControlId(undefined);
								}}
							>
								Add
							</Button>
						</Flex>
					</Flex>

					<Flex justify="end">
						<Dialog.Close>
							<Button
								style={{ cursor: "pointer" }}
								variant="soft"
								color="gray"
							>
								Close
							</Button>
						</Dialog.Close>
					</Flex>
				</Flex>
			</Dialog.Content>
		</Dialog.Root>
	);
};

export default function PolicyPage() {
	const { policyId } = useParams();
	const {
		data: policyWithControls,
		isPending,
		error,
	} = useGetPolicy(policyId as string);
	const {
		data: controls,
		isPending: isControlsPending,
		error: controlsError,
	} = useListControls();
	const [policyWithControlsState, setPolicyWithControlsState] =
		useImmer<TPolicyWithControls | null>(null);

	useCopilotReadable({
		description: `The current policy is "${policyWithControlsState?.policy.name}".`,
		value: policyWithControlsState?.policy.content || "",
	});

	useEffect(() => {
		if (policyWithControls) {
			setPolicyWithControlsState(policyWithControls);
		}
	}, [policyWithControls]);

	if (isPending || isControlsPending) {
		return <div>Loading...</div>;
	}

	if (error || controlsError) {
		return <ErrorCallout />;
	}

	return (
		<Grid rows="56px 1fr" width="auto" height="100%">
			<Box width="100%" height="100%">
				<Flex
					pb="2"
					pt="2"
					pl="4"
					pr="4"
					justify="between"
					align="center"
					className="border-b-2 border-gray-200"
					height="56px"
					width="calc(100% - 56px)"
					style={{
						position: "fixed",
						zIndex: 100,
						backgroundColor: "white",
					}}
				>
					<Flex align="center" justify="start" gap="4">
						<Link href="/policies">
							<BackIcon />
						</Link>
						<Text size="4" weight="medium">
							{policyWithControlsState?.policy.name || ""}
						</Text>
					</Flex>

					<Flex gap="2">
						<Button style={{ cursor: "pointer" }} color="red">
							Delete
						</Button>
						<Button style={{ cursor: "pointer" }}>Save</Button>
						<Button style={{ cursor: "pointer" }} color="green">
							Request Approval
						</Button>
					</Flex>
				</Flex>
			</Box>

			<Flex width="100%" height="100%">
				<div data-color-mode="light" className="w-full">
					<div className="wmde-markdown-var" />
					<MDEditor
						height="100%"
						style={{
							width: "100%",
						}}
						value={policyWithControlsState?.policy.content || ""}
						onChange={(newValue) =>
							setPolicyWithControlsState((draft) => {
								if (draft) {
									draft.policy.content = newValue || "";
								}
							})
						}
						preview="preview"
					/>
				</div>

				<Flex
					width={{ xl: "500px", xs: "400px" }}
					height="100%"
					style={{ borderRight: "1px solid #e0e0e0" }}
					direction="column"
					p="4"
					gap="4"
				>
					<Text size="3" weight="medium">
						Properties
					</Text>

					<Flex direction="column" gap="2">
						<Text>Policy Owner</Text>
						<Select.Root
							value={policyWithControlsState?.policy.owner}
						>
							<Select.Trigger />
							<Select.Content>
								<Select.Item value="default.user@admyral.ai">
									default.user@admyral.ai
								</Select.Item>
							</Select.Content>
						</Select.Root>
					</Flex>

					<Flex direction="column" gap="2">
						<Text>Version</Text>
						<TextField.Root
							value={policyWithControlsState?.policy.version}
						/>
					</Flex>

					<Flex direction="column" gap="2">
						<Text>Effective Date</Text>
						<TextField.Root value="2024-11-10">
							<TextField.Slot side="left">
								<CalendarIcon />
							</TextField.Slot>
						</TextField.Root>
					</Flex>

					<Flex direction="column" height="100%" gap="4">
						<Flex justify="between" align="center">
							<Text>Controls</Text>
							<EditControls
								addControl={(control) => {
									setPolicyWithControlsState((draft) => {
										if (draft) {
											draft.controls.push(control);
										}
									});
								}}
								removeControl={(idx) => {
									setPolicyWithControlsState((draft) => {
										if (draft) {
											draft.controls.splice(idx, 1);
										}
									});
								}}
								mappedControls={
									policyWithControlsState?.controls || []
								}
								controls={controls || []}
							/>
						</Flex>

						<ScrollArea
							scrollbars="vertical"
							style={{
								height: "calc(100vh - 430px)",
								width: "100%",
							}}
						>
							<Flex
								direction="column"
								gap="2"
								width="100%"
								height="100%"
							>
								{policyWithControlsState &&
									policyWithControlsState.controls.map(
										(control) => (
											<Control control={control} />
										),
									)}
							</Flex>
						</ScrollArea>
					</Flex>
				</Flex>

				<Flex width={{ xl: "600px", xs: "500px" }} height="100%">
					<CopilotChat
						className="w-full"
						instructions={SYSTEM_INSTRUCTIONS}
						labels={{
							title: "Your Assistant",
							initial: "Hi! 👋 How can I assist you today?",
						}}
					/>
				</Flex>
			</Flex>
		</Grid>
	);
}
