/*

TODO:

- let the continuous loop grow based on the depth of the loop body

*/

import {
	EditorWorkflowHandleType,
	TEditorWorkflowLoopNode,
} from "@/types/react-flow";
import { Handle, NodeProps, Position } from "reactflow";
import NodeBase from "./node-base";
import ActionIcon from "../workflow-editor/action-icon";
import React, { memo } from "react";
import { Flex } from "@radix-ui/themes";

function getLoopBodyDepth(loopNode: TEditorWorkflowLoopNode) {
	// TODO:
	return 1;
}

type LoopNodeProps = NodeProps<TEditorWorkflowLoopNode>;

function LoopNode({ id, data, selected }: LoopNodeProps) {
	return (
		<>
			<Handle
				type="target"
				id={EditorWorkflowHandleType.TARGET}
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
				icon={<ActionIcon actionType="loop" />}
				name="Loop"
			/>

			{/* Loop path */}
			<svg
				style={{
					position: "absolute",
					left: 0,
					top: 0,
					width: "100%",
					height: "100%",
					pointerEvents: "none",
					overflow: "visible",
				}}
			>
				<marker
					className="react-flow__arrowhead"
					id="arrowhead"
					markerWidth="15"
					markerHeight="15"
					viewBox="-10 -10 20 20"
					markerUnits="strokeWidth"
					orient="auto-start-reverse"
					refX="0"
					refY="0"
				>
					<polyline
						stroke-linecap="round"
						stroke-linejoin="round"
						points="-5,-4 0,0 -5,4 -5,-4"
						style={{
							stroke: "var(--Accent-color-Accent-9, #3E63DD)",
							fill: "var(--Accent-color-Accent-9, #3E63DD)",
							strokeWidth: 1,
						}}
					></polyline>
				</marker>

				<path
					d={`
						M ${133},${50}
						L ${133},${70}
						Q ${133},${80} ${143},${80}
						L ${256},${80}
						Q ${266},${80} ${266},${90}
						L ${266},${120}
					`}
					stroke="var(--Accent-color-Accent-9, #3E63DD)"
					strokeWidth="2"
					fill="none"
				/>

				<path
					d={`
						M ${266},${500}
						L ${266},${530}
						Q ${266},${540} ${256},${540}
						L ${10},${540}
						Q ${0},${540} ${0},${530}
						L ${0},${90}
						Q ${0},${80} ${10},${80}
						L ${128},${80}
					`}
					stroke="var(--Accent-color-Accent-9, #3E63DD)"
					strokeWidth="2"
					fill="none"
					markerEnd="url(#arrowhead)"
				/>

				<path
					d={`
						M ${133},${540}
						L ${133},${580}
					`}
					stroke="var(--Accent-color-Accent-9, #3E63DD)"
					strokeWidth="2"
					fill="none"
				/>
			</svg>

			{/* Handles */}
			<Handle
				type="source"
				id={EditorWorkflowHandleType.LOOP_BODY_START}
				position={Position.Bottom}
				style={{
					height: "16px",
					width: "16px",
					borderRadius: "var(--Radius-full, 9999px)",
					border: "2px solid var(--Accent-color-Accent-4, #E6EDFE)",
					background: "var(--Accent-color-Accent-9, #3E63DD)",
					alignContent: "center",
					justifyContent: "center",
					zIndex: 50,
					top: "118px",
					left: "266px",
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

			<Handle
				type="target"
				id={EditorWorkflowHandleType.LOOP_BODY_END}
				position={Position.Bottom}
				style={{
					height: "16px",
					width: "16px",
					borderRadius: "var(--Radius-full, 9999px)",
					border: "2px solid var(--Accent-color-Accent-4, #E6EDFE)",
					background: "var(--Accent-color-Accent-9, #3E63DD)",
					alignContent: "center",
					justifyContent: "center",
					zIndex: 50,
					top: "500px", // TODO: this need to be calculated dynamically based on the depth of the loop body
					left: "266px",
				}}
				isConnectableStart={false}
			/>

			<Handle
				type="source"
				id={EditorWorkflowHandleType.SOURCE}
				position={Position.Bottom}
				style={{
					height: "16px",
					width: "16px",
					borderRadius: "var(--Radius-full, 9999px)",
					border: "2px solid var(--Accent-color-Accent-4, #E6EDFE)",
					background: "var(--Accent-color-Accent-9, #3E63DD)",
					alignContent: "center",
					justifyContent: "center",
					zIndex: 50,
					top: "580px", // TODO: this need to be calculated dynamically based on the depth of the loop body
					left: "133px",
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

export default memo(LoopNode);
