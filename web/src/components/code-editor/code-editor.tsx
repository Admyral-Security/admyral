import { Editor as ReactMonacoEditor, type Monaco } from "@monaco-editor/react";
import { editor } from "monaco-editor";

interface CodeEditorProps {
	defaultValue?: string;
	value?: string;
	onChange?: (value: string) => void;
	className?: string;
	language?: string;
	readOnly?: boolean;
}

export default function CodeEditor({
	className,
	language,
	onChange,
	value,
	readOnly,
	...props
}: CodeEditorProps) {
	const handleEditorDidMount = (
		editor: editor.IStandaloneCodeEditor,
		monaco: Monaco,
	) => {
		monaco.editor.defineTheme("custom", {
			base: "vs",
			inherit: true,
			rules: [],
			colors: {
				"editor.lineHighlightBackground": "#e8f7ff",
				"editorLineNumber.foreground": "#5A5A5A",
			},
		});
		monaco.editor.setTheme("custom");
	};

	return (
		<ReactMonacoEditor
			{...(language && { language })}
			onMount={handleEditorDidMount}
			onChange={
				onChange ? (value, _ev) => onChange(value || "") : undefined
			}
			theme="custom"
			options={{
				tabSize: 2,
				minimap: { enabled: false },
				scrollbar: {
					verticalScrollbarSize: 5,
					horizontalScrollbarSize: 5,
				},
				renderLineHighlight: "all",
				inlineSuggest: { enabled: false },
				suggestOnTriggerCharacters: false,
				quickSuggestions: false,
				wordBasedSuggestions: "off",
				suggest: { preview: false },
				readOnly: readOnly,
			}}
			width="100%"
			wrapperProps={{ className: "editor-wrapper" }}
			value={value || ""}
			{...props}
		/>
	);
}
