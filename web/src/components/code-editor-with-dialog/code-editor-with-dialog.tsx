import { Flex, Dialog } from "@radix-ui/themes";
import { CodeEditor } from "@/components/code-editor/code-editor";
import CodeEditorWithDialogButton from "@/components/code-editor-with-dialog-button/code-editor-with-dialog-button";

interface CodeEditorWithDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	value: string;
	onChange: (value: string | undefined) => void;
	language: string;
}

export default function CodeEditorWithDialog({
	open,
	onOpenChange,
	title,
	value,
	onChange,
	language,
}: CodeEditorWithDialogProps) {
	return (
		<Dialog.Root open={open} onOpenChange={onOpenChange}>
			<Dialog.Content
				style={{ maxWidth: "min(90vw, 800px)", width: "100%" }}
			>
				<Flex justify="between" align="center" mb="4">
					<Dialog.Title>{title}</Dialog.Title>
					<Dialog.Close>
						<CodeEditorWithDialogButton />
					</Dialog.Close>
				</Flex>
				<CodeEditor
					value={value}
					onChange={onChange}
					className="h-[30vh] w-full"
					language={language}
				/>
			</Dialog.Content>
		</Dialog.Root>
	);
}
