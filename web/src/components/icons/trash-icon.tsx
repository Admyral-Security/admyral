export interface TrashIconProps {
	color: string;
}

export default function TrashIcon({ color }: TrashIconProps) {
	return (
		<svg
			width="18"
			height="18"
			viewBox="0 0 18 18"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
		>
			<path
				d="M5.25 4.5V2.25C5.25 1.83579 5.58579 1.5 6 1.5H12C12.4142 1.5 12.75 1.83579 12.75 2.25V4.5H16.5V6H15V15.75C15 16.1642 14.6642 16.5 14.25 16.5H3.75C3.33579 16.5 3 16.1642 3 15.75V6H1.5V4.5H5.25ZM6.75 3V4.5H11.25V3H6.75Z"
				fill={color}
			/>
		</svg>
	);
}
