import { useState, useEffect } from "react";
import { Flex, Dialog, IconButton } from "@radix-ui/themes";
import { SizeIcon } from "@radix-ui/react-icons";
import { CodeEditor } from "@/components/code-editor/code-editor";

interface CodeEditorWithDialogProps {
	title?: string;
	value: string;
	onChange: (value: string) => void;
	language?: string;
}

export default function CodeEditorWithDialog({
	title,
	value,
	onChange,
	language,
}: CodeEditorWithDialogProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [currentValue, setCurrentValue] = useState(value);

	useEffect(() => {
		setCurrentValue(value);
	}, [value]);

	const handleOpenChange = (open: boolean) => {
		setIsOpen(open);
		if (!open) {
			onChange(currentValue);
		}
	};

	const handleEditorChange = (value: string | undefined) => {
		setCurrentValue(value ?? "");
		onChange(value ?? "");
	};

	return (
		<Flex direction="column" gap="10" width="100%">
			<div className="relative w-full">
				<CodeEditor
					value={currentValue}
					onChange={handleEditorChange}
					language={language}
					className=" h-16 w-full"
				/>
				<IconButton
					variant="ghost"
					size="1"
					onClick={() => setIsOpen(true)}
					style={{
						position: "absolute",
						top: "-15%",
						right: "0%",
						transform: "translateY(-50%)",
					}}
				>
					<SizeIcon />
				</IconButton>
			</div>
			<Dialog.Root open={isOpen} onOpenChange={handleOpenChange}>
				<Dialog.Content
					style={{ maxWidth: "min(90vw, 800px)", width: "100%" }}
				>
					<Flex direction="column" gap="4">
						<Flex justify="between" align="center">
							<Dialog.Title>{title}</Dialog.Title>
							<Dialog.Close>
								<IconButton variant="ghost" size="1">
									<SizeIcon />
								</IconButton>
							</Dialog.Close>
						</Flex>
						<CodeEditor
							value={currentValue}
							onChange={handleEditorChange}
							className="h-[30vh] w-full"
							language={language}
						/>
					</Flex>
				</Dialog.Content>
			</Dialog.Root>
		</Flex>
	);
}
