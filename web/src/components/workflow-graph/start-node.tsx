"use client";

import { memo } from "react";
import { NodeProps, Handle, Position } from "reactflow";
import NodeBase from "./node-base";
import { Flex } from "@radix-ui/themes";
import { TEditorWorkflowStartNode } from "@/types/react-flow";
import StartWorkflowActionIcon from "../icons/start-workflow-icon";
import { useWorkflowStore } from "@/stores/workflow-store";

function toSnakeCase(name: string): string {
	return name.replaceAll(" ", "_").toLowerCase();
}

type StartNodeProps = NodeProps<TEditorWorkflowStartNode>;

function StartNode({ id, selected }: StartNodeProps) {
	const { workflowName } = useWorkflowStore();
	return (
		<>
			<NodeBase
				nodeId={id}
				selected={selected}
				icon={<StartWorkflowActionIcon />}
				name={"Start Workflow"}
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

export default memo(StartNode);
