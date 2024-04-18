import { CopyIcon } from "@radix-ui/react-icons";
import { Button, Flex, TextField, Tooltip } from "@radix-ui/themes";

export interface CopyTextProps {
	text: string;
}

export default function CopyText({ text }: CopyTextProps) {
	return (
		<Flex gap="2">
			<TextField.Root
				onClick={() => navigator.clipboard.writeText(text)}
				style={{
					cursor: "pointer",
					width: "100%",
					borderColor: "initial",
				}}
				value={text}
				disabled
			/>

			<Tooltip content="Click to copy">
				<Button
					size="2"
					variant="soft"
					color="gray"
					style={{
						cursor: "pointer",
						paddingLeft: 8,
						paddingRight: 8,
					}}
					onClick={() => navigator.clipboard.writeText(text)}
				>
					<CopyIcon width="16" height="16" />
				</Button>
			</Tooltip>
		</Flex>
	);
}
