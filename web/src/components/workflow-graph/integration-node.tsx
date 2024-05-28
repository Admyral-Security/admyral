import { memo } from "react";
import { NodeProps, Handle, Position } from "reactflow";
import NodeBase from "./node-base";
import { Flex } from "@radix-ui/themes";
import { IntegrationData } from "@/lib/types";
import { IntegrationType } from "@/lib/integrations";
import _ from "lodash";
import IntegrationLogoIcon from "../integration-logo-icon";

type IntegrationNodeProps = NodeProps<IntegrationData>;

function IntegrationNodeComponent({
	id,
	data,
	selected,
}: IntegrationNodeProps) {
	const isIntegrationSelected = !_.isEmpty(data.actionDefinition);
	const icon = isIntegrationSelected
		? ((data.actionDefinition as any).integrationType as IntegrationType)
		: null;

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
				icon={<IntegrationLogoIcon integration={icon} />}
				name={data.actionName}
				type="Integration"
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

export default memo(IntegrationNodeComponent);
