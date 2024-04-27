import { Badge, Button, Card, Flex, HoverCard, Text } from "@radix-ui/themes";
import { NodeToolbar, Position } from "reactflow";
import TrashIcon from "../icons/trash-icon";
import PlayIcon from "../icons/play-icon";
import useWorkflowStore from "@/lib/workflow-store";

export interface NodeBaseProps {
	nodeId: string;
	icon: React.ReactNode;
	type: string;
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
	const { duplicateAction, deleteAction, setTriggerNodeId } =
		useWorkflowStore((state) => ({
			duplicateAction: state.duplicateNode,
			deleteAction: state.deleteNode,
			setTriggerNodeId: state.setTriggerNodeId,
		}));

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
				<Flex width="237px" align="center" justify="start" gap="2">
					<Flex width="32px" justify="start" align="center">
						{icon}
					</Flex>

					<Flex direction="column" width="205px">
						<Text size="3" weight="bold">
							{name}
						</Text>
						<Text
							size="2"
							style={{
								color: "var(--Neutral-color-Neutral-9, #8B8D98)",
							}}
						>
							{type}
						</Text>
					</Flex>
				</Flex>
			</Card>

			<NodeToolbar isVisible={selected} position={Position.Right}>
				<Card style={{ padding: 0, paddingLeft: 2, paddingRight: 2 }}>
					<Flex align="center" width="auto">
						<Flex
							width="32px"
							height="32px"
							justify="center"
							align="center"
						>
							<HoverCard.Root>
								<HoverCard.Trigger>
									<Button
										variant="ghost"
										style={{
											cursor: "pointer",
											padding: 0,
											width: "100%",
											height: "100%",
										}}
										onClick={() => setTriggerNodeId(nodeId)}
									>
										<PlayIcon fill={"#60646C"} />
									</Button>
								</HoverCard.Trigger>

								<HoverCard.Content style={{ padding: 0 }}>
									<Badge size="3" color="gray">
										Run
									</Badge>
								</HoverCard.Content>
							</HoverCard.Root>
						</Flex>

						<Flex
							width="32px"
							height="32px"
							justify="center"
							align="center"
						>
							<HoverCard.Root>
								<HoverCard.Trigger>
									<Button
										variant="ghost"
										style={{
											cursor: "pointer",
											padding: 0,
											width: "100%",
											height: "100%",
										}}
										onClick={() => duplicateAction(nodeId)}
									>
										<svg
											width="16"
											height="16"
											viewBox="0 0 16 16"
											fill="none"
											xmlns="http://www.w3.org/2000/svg"
										>
											<path
												d="M4.66653 4V2C4.66653 1.63182 4.96501 1.33334 5.3332 1.33334H13.3332C13.7014 1.33334 13.9999 1.63182 13.9999 2V11.3333C13.9999 11.7015 13.7014 12 13.3332 12H11.3332V13.9994C11.3332 14.3679 11.0333 14.6667 10.662 14.6667H2.67111C2.30039 14.6667 2 14.3703 2 13.9994L2.00173 4.66725C2.0018 4.29874 2.30176 4 2.67295 4H4.66653ZM5.99987 4H11.3332V10.6667H12.6665V2.66667H5.99987V4Z"
												fill="#60646C"
											/>
										</svg>
									</Button>
								</HoverCard.Trigger>

								<HoverCard.Content style={{ padding: 0 }}>
									<Badge size="3" color="gray">
										Duplicate
									</Badge>
								</HoverCard.Content>
							</HoverCard.Root>
						</Flex>

						<Flex
							width="32px"
							height="32px"
							justify="center"
							align="center"
						>
							<HoverCard.Root>
								<HoverCard.Trigger>
									<Button
										variant="ghost"
										style={{
											cursor: "pointer",
											padding: 0,
											width: "100%",
											height: "100%",
										}}
										onClick={() => deleteAction(nodeId)}
									>
										<TrashIcon color="#60646C" />
									</Button>
								</HoverCard.Trigger>

								<HoverCard.Content style={{ padding: 0 }}>
									<Badge size="3" color="gray">
										Delete
									</Badge>
								</HoverCard.Content>
							</HoverCard.Root>
						</Flex>
					</Flex>
				</Card>
			</NodeToolbar>
		</>
	);
}
