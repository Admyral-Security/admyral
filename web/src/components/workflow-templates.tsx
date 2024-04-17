import { Cross1Icon } from "@radix-ui/react-icons";
import { Button, Card, Dialog, Flex, Text } from "@radix-ui/themes";
import RightArrowIcon from "./icons/right-arrow-icon";

// TODO: workflow template cards
export default function WorkflowTemplates() {
	return (
		<Dialog.Root>
			<Dialog.Trigger>
				<Card
					style={{
						padding: "8px",
					}}
					asChild
				>
					<button type="button" style={{ cursor: "pointer" }}>
						<Flex justify="between" align="center" width="100%">
							<Text size="3" weight="medium">
								Workflow Templates
							</Text>

							<RightArrowIcon />
						</Flex>
					</button>
				</Card>
			</Dialog.Trigger>

			<Dialog.Content maxWidth="1064px">
				<Flex direction="column" gap="3">
					<Flex justify="between" align="center">
						<Text weight="bold" size="5">
							Workflow Templates
						</Text>

						<Dialog.Close>
							<Button
								size="2"
								variant="soft"
								color="gray"
								style={{
									cursor: "pointer",
									paddingLeft: 8,
									paddingRight: 8,
								}}
							>
								<Cross1Icon width="16" height="16" />
							</Button>
						</Dialog.Close>
					</Flex>
				</Flex>

				<Text>Templates</Text>
			</Dialog.Content>
		</Dialog.Root>
	);
}
