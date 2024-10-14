import { IconButton } from "@radix-ui/themes";
import { SizeIcon } from "@radix-ui/react-icons";

interface CodeEditorWithDialogButtonProps {
	onClick?: () => void;
	variant?:
		| "ghost"
		| "classic"
		| "solid"
		| "soft"
		| "surface"
		| "outline"
		| undefined;
	size?: "1" | "2" | "3" | "4" | undefined;
}

export default function CodeEditorWithDialogButton({
	onClick,
	variant = "ghost",
	size = "1",
}: CodeEditorWithDialogButtonProps) {
	return (
		<IconButton variant={variant} size={size} onClick={onClick}>
			<SizeIcon />
		</IconButton>
	);
}
