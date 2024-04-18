import { Cross1Icon } from "@radix-ui/react-icons";
import { Box, Button, Card, Flex, Text } from "@radix-ui/themes";

export interface WorkflowBuilderRightPanelBaseProps {
	title: string;
	titleIcon?: React.ReactNode;
	children: React.ReactNode;
	onIconClick: () => void;
	zIndex?: number;
}

export default function WorkflowBuilderRightPanelBase({
	title,
	titleIcon,
	children,
	onIconClick,
	zIndex = 10,
}: WorkflowBuilderRightPanelBaseProps) {
	return (
		<Card
			style={{
				position: "fixed",
				right: "16px",
				top: "68px",
				zIndex,
				width: "384px",
				backgroundColor: "white",
				height: "calc(99vh - 68px)",
				padding: 0,
				display: "flex",
				flexDirection: "column",
			}}
			size="4"
		>
			<Flex direction="column" height="100%">
				<Flex
					width="100%"
					style={{
						borderBottom:
							"1px solid var(--Neutral-color-Neutral-3, #E5E7EB)",
					}}
					justify="between"
					align="center"
					p="4"
				>
					<Flex gap="2" align="center">
						{titleIcon !== undefined && titleIcon}
						<Text size="4" weight="medium">
							{title}
						</Text>
					</Flex>

					<Button
						size="2"
						variant="soft"
						color="gray"
						style={{
							cursor: "pointer",
							paddingLeft: 8,
							paddingRight: 8,
						}}
						onClick={onIconClick}
					>
						<Cross1Icon width="16" height="16" />
					</Button>
				</Flex>

				<Box
					width="100%"
					height="100%"
					style={{ flex: 1, overflowY: "auto" }}
				>
					{children}
				</Box>
			</Flex>
		</Card>
	);
}
