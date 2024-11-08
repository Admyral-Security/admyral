import { useWorkflowStore } from "@/stores/workflow-store";
import { Cross1Icon } from "@radix-ui/react-icons";
import { IconButton } from "@radix-ui/themes";
import {
	BaseEdge,
	EdgeProps,
	getBezierPath,
	Edge,
	EdgeLabelRenderer,
} from "reactflow";

export type DirectedEdge = Edge;

export default function DirectedEdgeComponent({
	id,
	sourceX,
	sourceY,
	targetX,
	targetY,
	markerEnd,
	selected,
}: EdgeProps) {
	const [edgePath, labelX, labelY] = getBezierPath({
		sourceX,
		sourceY,
		targetX,
		targetY,
	});
	const { deleteEdge } = useWorkflowStore();

	return (
		<>
			<BaseEdge
				id={id}
				path={edgePath}
				style={{
					stroke: "var(--Accent-color-Accent-9, #3E63DD)",
					strokeWidth: 2,
					zIndex: 51,
				}}
				markerEnd={markerEnd}
			/>
			{selected && (
				<BaseEdge
					id={id}
					path={edgePath}
					style={{
						stroke: "var(--Accent-color-Accent-9, #3E63DD)",
						strokeWidth: 6,
						zIndex: 51,
						strokeOpacity: 0.4,
					}}
				/>
			)}
			{selected && (
				<EdgeLabelRenderer>
					<IconButton
						style={{
							position: "absolute",
							transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
							pointerEvents: "all",
							cursor: "pointer",
							height: "15px",
							width: "15px",
							backgroundColor:
								"var(--Accent-color-Accent-9, #3E63DD)",
							borderRadius: "50%",
						}}
						onClick={() => deleteEdge(id)}
					>
						<Cross1Icon height="8" width="8" color="white" />
					</IconButton>
				</EdgeLabelRenderer>
			)}
		</>
	);
}
