import { Card, Flex, Text, Tooltip } from "@radix-ui/themes";
import { NodeToolbar, Position } from "reactflow";
import * as Toolbar from "@radix-ui/react-toolbar";
import DuplicateIcon from "../icons/duplicate-icon";
import { useWorkflowStore } from "@/stores/workflow-store";
import { TrashIcon, ExclamationTriangleIcon } from "@radix-ui/react-icons";

export interface NodeBaseProps {
	nodeId: string;
	icon: React.ReactNode;
	type?: string | undefined;
	name: string;
	selected: boolean;
}

export default function NodeBase({
	nodeId,
	icon,
	type,
	name,
	selected,
}: NodeBaseProps) {
	const { nodes, duplicateNodeByIdx, deleteNodeByIdx, hasDeletedSecret } =
		useWorkflowStore();

	const nodeIdx = nodes.findIndex((node) => node.id === nodeId);
	if (nodeIdx === -1) {
		return null;
	}

	const cardStyle = selected
		? {
				boxShadow: "0px 4px 12px 0px rgba(62, 99, 221, 0.20)",
				border: "2px solid var(--Accent-color-Accent-9, #3E63DD)",
				background: "var(--Accent-color-Accent-2, #F8FAFF)",
				borderRadius: "var(--Radius-4, 10px)",
			}
		: {
				boxShadow: "1px 1px 4px 0px rgba(0, 0, 0, 0.20)",
			};

	return (
		<>
			<Card size="1" style={cardStyle}>
				<Flex width="242px" align="center" justify="start" gap="2">
					<Flex width="42px" justify="center" align="center">
						{icon}
					</Flex>

					<Flex direction="column" width="205px">
						<Text size="3" weight="bold">
							{name}
						</Text>
						{type && (
							<Text
								size="2"
								style={{
									color: "var(--Neutral-color-Neutral-9, #8B8D98)",
								}}
							>
								{type}
							</Text>
						)}
					</Flex>
				</Flex>
			</Card>

			<NodeToolbar
				isVisible={hasDeletedSecret(nodeId)}
				position={Position.Top}
				offset={8}
				align="end"
			>
				<Tooltip content="Missing Secret">
					<Flex
						style={{
							transform: "translate(10px, 24px)",
						}}
					>
						<Flex
							inset="0"
							position="absolute"
							className="bg-[var(--red-9)] rounded-full"
						/>
						<Flex
							position="relative"
							className="rounded-full"
							width="24px"
							height="24px"
							justify="center"
							align="center"
						>
							<ExclamationTriangleIcon
								color="white"
								width="14px"
								height="14px"
							/>
						</Flex>
					</Flex>
				</Tooltip>
			</NodeToolbar>

			<NodeToolbar
				isVisible={selected && nodeId !== "start"}
				position={Position.Right}
			>
				<Toolbar.Root
					className="flex w-full min-w-max rounded-md bg-white border-2 border-2-gray-200"
					aria-label="Formatting options"
				>
					<Flex gap="1">
						<Toolbar.Button
							style={{
								width: "32px",
								height: "32px",
							}}
							onClick={() => duplicateNodeByIdx(nodeIdx)}
						>
							<Tooltip content="Duplicate">
								<Flex
									width="100%"
									height="100%"
									justify="center"
									align="center"
								>
									<DuplicateIcon />
								</Flex>
							</Tooltip>
						</Toolbar.Button>
						<Toolbar.Button
							style={{ width: "32px", height: "32px" }}
							onClick={() => deleteNodeByIdx(nodeIdx)}
						>
							<Tooltip content="Delete">
								<Flex
									width="100%"
									height="100%"
									justify="center"
									align="center"
								>
									<TrashIcon color="#60646C" />
								</Flex>
							</Tooltip>
						</Toolbar.Button>
					</Flex>
				</Toolbar.Root>
			</NodeToolbar>
		</>
	);
}
