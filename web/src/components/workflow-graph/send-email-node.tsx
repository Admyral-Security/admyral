import { memo } from "react";
import { Node, NodeProps, Handle, Position } from "reactflow";
import NodeBase from "./node-base";
import { Flex } from "@radix-ui/themes";
import SendEmailActionIcon from "../icons/send-email-action-icon";

type SendEmailData = {
	actionName: string;
};

export type SendEmailNode = Node<SendEmailData>;

function SendEmailNodeComponent({ data, selected }: NodeProps<SendEmailData>) {
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
				selected={selected}
				icon={<SendEmailActionIcon />}
				name={data.actionName}
				type="Send Email"
			/>
			<Handle
				type="source"
				position={Position.Bottom}
				style={{
					height: "16px",
					width: "16px",
					borderRadius: "var(--Radius-full, 9999px)",
					border: "2px solid var(--Accent-color-Accent-4, #E6EDFE)",
					background: "var(--Accent-color-Accent-9, #3E63DD)",
					alignContent: "center",
					justifyContent: "center",
					bottom: -8,
				}}
			>
				<Flex
					align="center"
					justify="center"
					style={{ pointerEvents: "none" }}
				>
					<svg
						width="6"
						height="6"
						viewBox="0 0 6 6"
						fill="none"
						xmlns="http://www.w3.org/2000/svg"
					>
						<path
							d="M3.33301 2.99992H5.66634L2.99967 5.66659L0.333008 2.99992H2.66634V0.333252H3.33301V2.99992Z"
							fill="white"
						/>
					</svg>
				</Flex>
			</Handle>
		</>
	);
}

export default memo(SendEmailNodeComponent);
