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
} from "@radix-ui/themes";
import MDEditor from "@uiw/react-md-editor";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

const SYSTEM_INSTRUCTIONS =
	"You are a helpful assistant with expert knowledge in security compliance (e.g., SOC2, ISO27001, PCI-DSS). Answer in the best way possible given the data you have. You have access to a security policy. Answer questions about the policy truthfully.";

const CONTROLS = [
	{
		id: "CP5",
		name: "Acceptable Use of End-user Computing",
		workflows: [
			{
				id: "c30cf771-2029-4a27-818a-6d130b9e124d",
				name: "Kandji Device Information",
			},
			{
				id: "b148808a-4902-4a1a-ba51-6ec50a9effae",
				name: "Kandji Alert for Unencrypted Devices",
			},
		],
	},
	{
		id: "CP6",
		name: "Support and Management of BYOD Devices",
		workflows: [
			{
				id: "c30cf771-2029-4a27-818a-6d130b9e124d",
				name: "Kandji Device Information",
			},
			{
				id: "b148808a-4902-4a1a-ba51-6ec50a9effae",
				name: "Kandji Alert for Unencrypted Devices",
			},
		],
	},
	{
		id: "CP12",
		name: "Encryption Key Management",
		workflows: [
			{
				id: "c30cf771-2029-4a27-818a-6d130b9e124d",
				name: "Kandji Device Information",
			},
			{
				id: "b148808a-4902-4a1a-ba51-6ec50a9effae",
				name: "Kandji Alert for Unencrypted Devices",
			},
		],
	},
	{
		id: "CP15",
		name: "User Endpoint Security Controls and Configuration",
		workflows: [
			{
				id: "c30cf771-2029-4a27-818a-6d130b9e124d",
				name: "Kandji Device Information",
			},
			{
				id: "b148808a-4902-4a1a-ba51-6ec50a9effae",
				name: "Kandji Alert for Unencrypted Devices",
			},
		],
	},
	{
		id: "CP16",
		name: "Server Hardening Guidelines and Processes",
		workflows: [
			{
				id: "c30cf771-2029-4a27-818a-6d130b9e124d",
				name: "Kandji Device Information",
			},
			{
				id: "b148808a-4902-4a1a-ba51-6ec50a9effae",
				name: "Kandji Alert for Unencrypted Devices",
			},
		],
	},
	{
		id: "CP17",
		name: "Encryption Key Management",
		workflows: [
			{
				id: "c30cf771-2029-4a27-818a-6d130b9e124d",
				name: "Kandji Device Information",
			},
			{
				id: "b148808a-4902-4a1a-ba51-6ec50a9effae",
				name: "Kandji Alert for Unencrypted Devices",
			},
		],
	},
	{
		id: "CP18",
		name: "Configuration and Management of Network Controls",
		workflows: [
			{
				id: "c30cf771-2029-4a27-818a-6d130b9e124d",
				name: "Kandji Device Information",
			},
			{
				id: "b148808a-4902-4a1a-ba51-6ec50a9effae",
				name: "Kandji Alert for Unencrypted Devices",
			},
		],
	},
	{
		id: "CP19",
		name: "Office Network and Wireless Access",
		workflows: [
			{
				id: "c30cf771-2029-4a27-818a-6d130b9e124d",
				name: "Kandji Device Information",
			},
			{
				id: "b148808a-4902-4a1a-ba51-6ec50a9effae",
				name: "Kandji Alert for Unencrypted Devices",
			},
		],
	},
	{
		id: "CP27",
		name: "Data Protection Implementation and Processes",
		workflows: [
			{
				id: "c30cf771-2029-4a27-818a-6d130b9e124d",
				name: "Kandji Device Information",
			},
			{
				id: "b148808a-4902-4a1a-ba51-6ec50a9effae",
				name: "Kandji Alert for Unencrypted Devices",
			},
		],
	},
];

const Control = ({ control }: { control: (typeof CONTROLS)[0] }) => {
	const [open, setOpen] = useState(false);

	return (
		<Collapsible.Root open={open} onOpenChange={setOpen}>
			<Flex direction="column" gap="2" pr="4">
				<Flex justify="between" align="center">
					<Text size="2">
						<Link href={`/policies/controls`}>{control.id}</Link>{" "}
						{control.name}
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

				<Collapsible.Content>
					<Flex direction="column" gap="2">
						{control.workflows.map((workflow) => (
							<Link size="2" href={`/editor/${workflow.id}`}>
								{workflow.name}
							</Link>
						))}
					</Flex>
				</Collapsible.Content>
			</Flex>
		</Collapsible.Root>
	);
};

export default function PolicyPage() {
	const { policyId } = useParams();
	const { data: policy, isPending, error } = useGetPolicy(policyId as string);
	const [policyTitle, setPolicyTitle] = useState<string>("");
	const [value, setValue] = useState<string>("");

	useCopilotReadable({
		description: `The current policy is "${policyTitle}".`,
		value,
	});

	useEffect(() => {
		if (policy) {
			setPolicyTitle(policy.name);
			setValue(policy.content);
		}
	}, [policy]);

	if (isPending) {
		return <div>Loading...</div>;
	}

	if (error) {
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
							{policy?.name || ""}
						</Text>
					</Flex>

					<Button>Request Approval</Button>
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
						value={value}
						onChange={(newValue) => setValue(newValue || "")}
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
						<Select.Root value={policy?.owner}>
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
						<TextField.Root value={policy?.version} />
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
							<Button
								variant="ghost"
								size="1"
								style={{ cursor: "pointer" }}
							>
								<Pencil1Icon />
								Edit
							</Button>
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
								{CONTROLS.map((control) => (
									<Control control={control} />
								))}
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
