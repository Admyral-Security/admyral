import { Flex } from "@radix-ui/themes";

interface RowProps {
	children: React.ReactNode;
	selected: boolean;
	onClickOnUnselectedRow: () => void;
}

export default function Row({
	children,
	selected,
	onClickOnUnselectedRow,
}: RowProps) {
	if (selected) {
		return (
			<Flex
				px="16px"
				py="2"
				style={{
					backgroundColor:
						"var(--Neutral-color-Neutral-Alpha-4, rgba(2, 2, 52, 0.08))",
				}}
			>
				{children}
			</Flex>
		);
	}

	return (
		<Flex
			px="16px"
			py="2"
			style={{
				cursor: "pointer",
			}}
			className="row"
			onClick={onClickOnUnselectedRow}
		>
			{children}
		</Flex>
	);
}
