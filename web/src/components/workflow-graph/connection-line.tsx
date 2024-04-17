import { ConnectionLineComponentProps, getBezierPath } from "reactflow";

export default function ConnectionLine({
	fromX,
	fromY,
	toX,
	toY,
}: ConnectionLineComponentProps) {
	const [d] = getBezierPath({
		sourceX: fromX,
		sourceY: fromY,
		targetX: toX,
		targetY: toY,
	});

	return (
		<g>
			<path
				fill="none"
				stroke="var(--Accent-color-Accent-9, #3E63DD)"
				strokeWidth={2}
				d={d}
			/>
			<circle
				cx={toX}
				cy={toY}
				fill="#fff"
				r={3}
				stroke="var(--Accent-color-Accent-9, #3E63DD)"
				strokeWidth={2}
			/>
		</g>
	);
}
