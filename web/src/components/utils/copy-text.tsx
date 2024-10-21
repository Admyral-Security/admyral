import { useToast } from "@/providers/toast";
import { CopyIcon } from "@radix-ui/react-icons";
import { Button, Flex, TextField, Tooltip } from "@radix-ui/themes";

export interface CopyTextProps {
	text: string;
}

export default function CopyText({ text }: CopyTextProps) {
	const { successToast } = useToast();
	const copyToClipboard = () => {
		navigator.clipboard.writeText(text);
		successToast("Copied to clipboard.");
	};

	return (
		<Flex gap="2">
			<TextField.Root
				onClick={copyToClipboard}
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
					onClick={copyToClipboard}
				>
					<CopyIcon width="16" height="16" />
				</Button>
			</Tooltip>
		</Flex>
	);
}
