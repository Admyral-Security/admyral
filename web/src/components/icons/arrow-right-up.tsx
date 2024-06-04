export interface ArrowRightUpIconProps {
	fill?: string;
}

export default function ArrowRightUpIcon({
	fill = "#3E63DD",
}: ArrowRightUpIconProps) {
	return (
		<svg
			width="16"
			height="16"
			viewBox="0 0 16 16"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
		>
			<path
				d="M10.6688 6.27614L4.93109 12.0139L3.98828 11.0711L9.72601 5.33333H4.66883V4H12.0021V11.3333H10.6688V6.27614Z"
				fill={fill}
			/>
		</svg>
	);
}
