import { Flex, Dialog, IconButton, Text } from "@radix-ui/themes";
import { SizeIcon } from "@radix-ui/react-icons";
import CodeEditor from "@/components/code-editor/code-editor";

interface CodeEditorWithDialogProps {
	title?: string;
	description?: string;
	defaultValue?: string;
	value?: string;
	onChange?: (value: string) => void;
	className?: string;
	language?: string;
	readOnly?: boolean;
}

export default function CodeEditorWithDialog({
	title,
	description,
	value,
	onChange,
	language,
	className,
	readOnly,
}: CodeEditorWithDialogProps) {
	return (
		<Flex width="100%" height="100%" position="relative">
			<CodeEditor
				value={value}
				onChange={onChange}
				language={language}
				className={className}
				readOnly={readOnly}
			/>

			<Dialog.Root>
				<Dialog.Trigger>
					<IconButton
						variant="ghost"
						size="1"
						style={{
							position: "absolute",
							top: "-18px",
							right: "0px",
							cursor: "pointer",
						}}
					>
						<SizeIcon />
					</IconButton>
				</Dialog.Trigger>

				<Dialog.Content
					style={{
						maxWidth: "min(90vw, 900px)",
						height: "min(90vh, 612px)",
					}}
				>
					<Flex direction="column" gap="2" height="100%" width="100%">
						<Flex justify="between" align="center">
							{title !== undefined && (
								<Text size="5" weight="medium">
									{title}
								</Text>
							)}
							<Dialog.Close>
								<IconButton
									variant="ghost"
									size="1"
									style={{ cursor: "pointer" }}
								>
									<SizeIcon />
								</IconButton>
							</Dialog.Close>
						</Flex>
						{description !== undefined && (
							<Flex justify="between" align="center">
								<Text size="3">{description}</Text>
							</Flex>
						)}
						<Flex height="100%" width="100%">
							<CodeEditor
								value={value}
								onChange={onChange}
								language={language}
								readOnly={readOnly}
							/>
						</Flex>
					</Flex>
				</Dialog.Content>
			</Dialog.Root>
		</Flex>
	);
}
