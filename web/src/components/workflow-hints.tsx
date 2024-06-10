import { Card, Flex, Text } from "@radix-ui/themes";
import BlueArrowLeftIcon from "./icons/blue-arrow-left";

export default function WorkflowHints() {
	return (
		<>
			<Flex
				style={{
					position: "fixed",
					left: "310px",
					top: "94px",
				}}
				gap="3"
				align="start"
			>
				<BlueArrowLeftIcon />

				<Card
					style={{
						width: "280px",
						border: "2px solid #3E63DD",
						boxShadow:
							"0px 4px 40px 0px rgba(62, 99, 221, 0.40), 0px 0px 20px 0px rgba(62, 99, 221, 0.12), 0px 0px 4px 0px rgba(62, 99, 221, 0.80)",
					}}
				>
					<Flex direction="column">
						<Text
							size="4"
							weight="medium"
							style={{ color: "#3E63DD" }}
						>
							Create individual workflows with natural language
							using the Workflow Assistant.
						</Text>
					</Flex>
				</Card>
			</Flex>

			<Flex
				style={{
					position: "fixed",
					left: "310px",
					top: "394px",
				}}
				gap="3"
				align="center"
			>
				<BlueArrowLeftIcon />

				<Card
					style={{
						width: "280px",
						border: "2px solid #3E63DD",
						boxShadow:
							"0px 4px 40px 0px rgba(62, 99, 221, 0.40), 0px 0px 20px 0px rgba(62, 99, 221, 0.12), 0px 0px 4px 0px rgba(62, 99, 221, 0.80)",
					}}
				>
					<Flex direction="column">
						<Text
							size="4"
							weight="medium"
							style={{ color: "#3E63DD" }}
						>
							To start drag actions from the left panel
						</Text>
					</Flex>
				</Card>
			</Flex>
		</>
	);
}
