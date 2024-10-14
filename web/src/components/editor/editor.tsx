import {
	EditorProps,
	Editor as ReactMonacoEditor,
	type Monaco,
	OnChange,
} from "@monaco-editor/react";
import { editor } from "monaco-editor";
import { cn } from "@/utils/tailwind";

export function CustomEditor({
	className,
	language,
	onChange,
	...props
}: EditorProps & {
	className?: string;
	language?: string;
	onChange?: OnChange;
}) {
	const handleEditorDidMount = (
		editor: editor.IStandaloneCodeEditor,
		monaco: Monaco,
	) => {
		monaco.editor.defineTheme("myCustomTheme", {
			base: "vs",
			inherit: true,
			rules: [],
			colors: {
				"editor.lineHighlightBackground": "#e8f7ff",
				"editorLineNumber.foreground": "#5A5A5A",
			},
		});
		monaco.editor.setTheme("myCustomTheme");
	};

	return (
		<div className={cn("h-36", className)}>
			<ReactMonacoEditor
				height="100%"
				{...(language && { language })}
				onMount={handleEditorDidMount}
				onChange={onChange}
				theme="myCustomTheme"
				options={{
					tabSize: 2,
					minimap: { enabled: false },
					scrollbar: {
						verticalScrollbarSize: 0,
						horizontalScrollbarSize: 5,
					},
					renderLineHighlight: "all",
					inlineSuggest: { enabled: false },
					suggestOnTriggerCharacters: false,
					quickSuggestions: false,
					wordBasedSuggestions: "off",
					suggest: { preview: false },
					...props.options,
				}}
				wrapperProps={{ className: "editor-wrapper" }}
				{...props}
			/>
		</div>
	);
}
