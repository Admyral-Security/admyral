import { BaseEdge, EdgeProps, getBezierPath, Edge } from "reactflow";

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
	const [edgePath] = getBezierPath({
		sourceX,
		sourceY,
		targetX,
		targetY,
	});

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
		</>
	);
}
