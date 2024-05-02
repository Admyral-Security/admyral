import { memo } from "react";
import { NodeProps, Handle, Position } from "reactflow";
import NodeBase from "./node-base";
import { Box, Flex, Text } from "@radix-ui/themes";
import IfConditionActionIcon from "../icons/if-condition-action-icon";
import { ibmPlexMono } from "@/app/fonts";
import { IfConditionData } from "@/lib/types";

export const IF_CONDITION_TRUE_BRANCH_HANDLE_ID: string =
	"ifConditionTrueBranch";
export const IF_CONDITION_FALSE_BRANCH_HANDLE_ID: string =
	"ifConditionFalseBranch";

type IfConditionNodeProps = NodeProps<IfConditionData>;

function IfConditionNodeComponent({
	id,
	data,
	selected,
}: IfConditionNodeProps) {
	return (
		<>
			<Handle
				type="target"
				position={Position.Top}
				style={{
					height: "16px",
					width: "16px",
					borderRadius: "var(--Radius-full, 9999px)",
					border: "2px solid var(--Accent-color-Accent-4, #E6EDFE)",
					background: "var(--Accent-color-Accent-9, #3E63DD)",
					alignContent: "center",
					justifyContent: "center",
					zIndex: 50,
					top: -8,
				}}
				isConnectableStart={false}
			/>
			<NodeBase
				nodeId={id}
				selected={selected}
				icon={<IfConditionActionIcon />}
				name={data.actionName}
				type="If-Condition"
			/>

			<Handle
				type="source"
				position={Position.Bottom}
				id={IF_CONDITION_TRUE_BRANCH_HANDLE_ID}
				style={{
					width: "48px",
					height: "18px",
					borderRadius: "var(--Radius-full, 9999px)",
					background:
						"var(--Variables-Backgrounds-white-to-dark, #FFF)",
					boxShadow: "1px 1px 4px 0px rgba(0, 0, 0, 0.20)",
					left: 100,
					bottom: -8,
				}}
			>
				<Flex
					align="center"
					justify="center"
					height="100%"
					width="100%"
					style={{ pointerEvents: "none" }}
				>
					<Box>
						<svg
							width="16"
							height="16"
							viewBox="0 0 16 16"
							fill="none"
							xmlns="http://www.w3.org/2000/svg"
						>
							<path
								d="M1 8C1 4.13401 4.13401 1 8 1C11.866 1 15 4.13401 15 8C15 11.866 11.866 15 8 15C4.13401 15 1 11.866 1 8Z"
								fill="#3E63DD"
							/>
							<path
								d="M1 8C1 4.13401 4.13401 1 8 1C11.866 1 15 4.13401 15 8C15 11.866 11.866 15 8 15C4.13401 15 1 11.866 1 8Z"
								stroke="#E6EDFE"
								stroke-width="2"
							/>
							<path
								d="M8.3335 8H10.6668L8.00016 10.6667L5.3335 8H7.66683V5.33334H8.3335V8Z"
								fill="white"
							/>
						</svg>
					</Box>

					<Text
						style={{
							fontSize: "10px",
							color: "var(--Accent-color-Accent-9, #3E63DD)",
							fontFamily: ibmPlexMono.style.fontFamily,
							letterSpacing: "0.04px",
							fontStyle: "normal",
						}}
					>
						True
					</Text>
				</Flex>
			</Handle>

			<Handle
				type="source"
				position={Position.Bottom}
				id={IF_CONDITION_FALSE_BRANCH_HANDLE_ID}
				style={{
					width: "52px",
					height: "18px",
					borderRadius: "var(--Radius-full, 9999px)",
					background:
						"var(--Variables-Backgrounds-white-to-dark, #FFF)",
					boxShadow: "1px 1px 4px 0px rgba(0, 0, 0, 0.20)",
					left: "auto",
					right: 50,
					bottom: -8,
				}}
			>
				<Flex
					align="center"
					justify="center"
					height="100%"
					width="100%"
					style={{ pointerEvents: "none" }}
				>
					<Box>
						<svg
							width="16"
							height="16"
							viewBox="0 0 16 16"
							fill="none"
							xmlns="http://www.w3.org/2000/svg"
						>
							<circle cx="8" cy="8" r="8" fill="#F0F4FF" />
							<circle
								cx="8"
								cy="8"
								r="7"
								stroke="#AEC0F5"
								stroke-width="2"
								stroke-dasharray="4 4"
							/>
							<path
								d="M2 8C2 4.68629 4.68629 2 8 2C11.3137 2 14 4.68629 14 8C14 11.3137 11.3137 14 8 14C4.68629 14 2 11.3137 2 8Z"
								fill="#3E63DD"
							/>
							<path
								d="M8.33301 8H10.6663L7.99967 10.6667L5.33301 8H7.66634V5.33333H8.33301V8Z"
								fill="white"
							/>
						</svg>
					</Box>

					<Text
						style={{
							fontSize: "10px",
							color: "var(--Accent-color-Accent-9, #3E63DD)",
							fontFamily: ibmPlexMono.style.fontFamily,
							letterSpacing: "0.04px",
							fontStyle: "normal",
						}}
					>
						False
					</Text>
				</Flex>
			</Handle>
		</>
	);
}

export default memo(IfConditionNodeComponent);
