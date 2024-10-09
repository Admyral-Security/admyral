import {
	EditorProps,
	Editor as ReactMonacoEditor,
	type Monaco,
	OnChange,
} from "@monaco-editor/react";
import { editor } from "monaco-editor";
import clsx, { ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function mergeCSSClasses(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

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
		<div className={mergeCSSClasses("h-36", className)}>
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
						verticalScrollbarSize: 5,
						horizontalScrollbarSize: 5,
					},
					renderLineHighlight: "all",
					...props.options,
				}}
				wrapperProps={{ className: "editor-wrapper" }}
				{...props}
			/>
		</div>
	);
}
