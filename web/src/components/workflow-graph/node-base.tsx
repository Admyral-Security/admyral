import { Button, Card, Flex, Text } from "@radix-ui/themes";
import { NodeToolbar, Position } from "reactflow";
import TrashIcon from "../icons/trash-icon";

export interface NodeBaseProps {
	icon: React.ReactNode;
	type: string;
	name: string;
	selected: boolean;
}

export default function NodeBase({
	icon,
	type,
	name,
	selected,
}: NodeBaseProps) {
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
					{icon}

					<Flex direction="column">
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
							<Button
								variant="ghost"
								style={{
									cursor: "pointer",
									padding: 0,
									width: "100%",
									height: "100%",
								}}
							>
								<svg
									width="16"
									height="16"
									viewBox="0 0 16 16"
									fill="none"
									xmlns="http://www.w3.org/2000/svg"
								>
									<path
										d="M8.00016 14.6667C4.31826 14.6667 1.3335 11.6819 1.3335 8C1.3335 4.3181 4.31826 1.33334 8.00016 1.33334C11.682 1.33334 14.6668 4.3181 14.6668 8C14.6668 11.6819 11.682 14.6667 8.00016 14.6667ZM7.08143 5.60973C7.03763 5.58052 6.98616 5.56494 6.9335 5.56494C6.78623 5.56494 6.66683 5.68433 6.66683 5.83161V10.1684C6.66683 10.2211 6.68243 10.2725 6.71163 10.3163C6.7933 10.4389 6.9589 10.472 7.08143 10.3903L10.334 8.22187C10.3633 8.20234 10.3884 8.1772 10.408 8.14794C10.4897 8.0254 10.4566 7.8598 10.334 7.77814L7.08143 5.60973Z"
										fill="#60646C"
									/>
								</svg>
							</Button>
						</Flex>

						<Flex
							width="32px"
							height="32px"
							justify="center"
							align="center"
						>
							<Button
								variant="ghost"
								style={{
									cursor: "pointer",
									padding: 0,
									width: "100%",
									height: "100%",
								}}
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
						</Flex>

						<Flex
							width="32px"
							height="32px"
							justify="center"
							align="center"
						>
							<Button
								variant="ghost"
								style={{
									cursor: "pointer",
									padding: 0,
									width: "100%",
									height: "100%",
								}}
							>
								<TrashIcon color="#60646C" />
							</Button>
						</Flex>
					</Flex>
				</Card>
			</NodeToolbar>
		</>
	);
}
