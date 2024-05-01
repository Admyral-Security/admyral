"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import { NodeProps, NodeToolbar, Position } from "reactflow";
import { NoteData } from "@/lib/types";
import {
	Badge,
	Button,
	Card,
	Flex,
	HoverCard,
	TextArea,
} from "@radix-ui/themes";
import useWorkflowStore from "@/lib/workflow-store";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import TrashIcon from "../icons/trash-icon";

enum MarkdownOperation {
	HEADER = "HEADER",
	BOLD = "BOLD",
	ITALIC = "ITALIC",
	STRIKETHROUGH = "STRIKETHROUGH",
	LINK = "LINK",
	CODE = "CODE",
	ORDERED_LIST = "ORDERED_LIST",
	LIST = "LIST",
	CHECKLIST = "CHECKLIST",
}

const MARKDOWN_OPERATIONS = {
	[MarkdownOperation.HEADER]: { markdown: "# ", cursorOffset: 2 },
	[MarkdownOperation.BOLD]: { markdown: "****", cursorOffset: 2 },
	[MarkdownOperation.ITALIC]: { markdown: "**", cursorOffset: 1 },
	[MarkdownOperation.STRIKETHROUGH]: { markdown: "~~", cursorOffset: 1 },
	[MarkdownOperation.LINK]: { markdown: "[](https://)", cursorOffset: 1 },
	[MarkdownOperation.CODE]: { markdown: "``", cursorOffset: 1 },
	[MarkdownOperation.ORDERED_LIST]: { markdown: "1. ", cursorOffset: 3 },
	[MarkdownOperation.LIST]: { markdown: "- ", cursorOffset: 2 },
	[MarkdownOperation.CHECKLIST]: { markdown: "- [ ] ", cursorOffset: 6 },
};

function LinkRenderer(props: any) {
	return (
		<a
			href={props.href}
			target="_blank"
			style={{
				color: "var(--Accent-color-Accent-9, #3E63DD)",
				cursor: "pointer",
				textDecoration: "underline",
			}}
		>
			{props.children}
		</a>
	);
}

function NoteNode({
	id,
	data,
	selected,
}: {
	id: string;
	data: NoteData;
	selected: boolean;
}) {
	const textAreaRef = useRef<HTMLTextAreaElement>(null);

	const [isEditing, setIsEditing] = useState<boolean>(false);
	const [lastCursorPositionStart, setLastCursorPositionStart] =
		useState<number>(0);
	const [lastCursorPositionEnd, setLastCursorPositionEnd] =
		useState<number>(0);

	const { updateData, deleteNode } = useWorkflowStore((state) => ({
		updateData: (data: NoteData) => state.updateNodeData(id, data),
		deleteNode: () => state.deleteNode(id),
	}));

	const handleBlur = useCallback(() => {
		if (isEditing) {
			// Track last cursor position
			const textArea = textAreaRef.current;
			if (textArea) {
				setLastCursorPositionStart(textAreaRef.current.selectionStart);
				setLastCursorPositionEnd(textAreaRef.current.selectionEnd);
			}
		}
	}, [isEditing]);

	useEffect(() => {
		const textArea = textAreaRef.current;
		if (textArea) {
			textArea.style.height = "auto";
			textArea.style.height = textArea.scrollHeight + "px";
		}
	}, [data.actionDefinition.note, isEditing]);

	useEffect(() => {
		const textArea = textAreaRef.current;
		if (textArea) {
			textArea.style.height = "auto";
			textArea.style.height = textArea.scrollHeight + "px";
		}
	}, []);

	useEffect(() => {
		if (!selected && isEditing) {
			setIsEditing(false);
		}
	}, [selected]);

	const handleToolbarClick = useCallback(
		(operation: MarkdownOperation) => {
			const textArea = textAreaRef.current;
			if (!textArea) {
				return;
			}

			const { markdown, cursorOffset } = MARKDOWN_OPERATIONS[operation];

			const textBefore = textArea.value.substring(
				0,
				lastCursorPositionStart,
			);
			const textAfter = textArea.value.substring(lastCursorPositionEnd);

			const newText = `${textBefore}${markdown}${textAfter}`;

			textArea.focus();
			textArea.value = newText;
			textArea.selectionStart = lastCursorPositionStart + cursorOffset;
			textArea.selectionEnd = lastCursorPositionEnd + cursorOffset;

			const clonedData = { ...data };
			clonedData.actionDefinition.note = newText;
			updateData(clonedData);
		},
		[data, updateData],
	);

	if (!isEditing) {
		const cardStyle = selected
			? {
					boxShadow: "0px 4px 12px 0px rgba(62, 99, 221, 0.20)",
					border: "2px solid var(--Accent-color-Accent-9, #3E63DD)",
					background: "var(--Accent-color-Accent-2, #F8FAFF)",
					borderRadius: "var(--Radius-4, 10px)",
				}
			: {
					boxShadow: "1px 1px 4px 0px rgba(0, 0, 0, 0.20)",
					backgroundColor:
						"var(--Panel-default, rgba(255, 255, 255, 0.80))",
				};

		return (
			<Card
				size="1"
				style={{
					...cardStyle,
					padding: "0px",
					color: "var(--Tokens-Colors-text, #1C2024)",
				}}
				onClick={(event) => {
					// Double-click to edit
					if (event.detail === 2) {
						setIsEditing(true);
					}
				}}
			>
				<Flex
					width="437px"
					align="center"
					justify="start"
					gap="2"
					p="2"
					style={{ fontSize: "14px" }}
				>
					<ReactMarkdown
						remarkPlugins={[remarkGfm]}
						className="markdown"
						components={{
							a: LinkRenderer,
						}}
					>
						{data.actionDefinition.note.length === 0
							? "Double click to edit"
							: data.actionDefinition.note}
					</ReactMarkdown>
				</Flex>
			</Card>
		);
	}

	return (
		<>
			<Card
				size="1"
				style={{
					boxShadow: "0px 4px 12px 0px rgba(62, 99, 221, 0.20)",
					border: "2px solid var(--Accent-color-Accent-9, #3E63DD)",
					background: "var(--Accent-color-Accent-2, #F8FAFF)",
					borderRadius: "var(--Radius-4, 10px)",
					padding: "0px",
				}}
			>
				<Flex width="437px" align="center" justify="start" gap="2">
					<TextArea
						autoFocus={true}
						ref={textAreaRef}
						value={data.actionDefinition.note}
						placeholder="Your note here..."
						style={{
							resize: "none",
							overflowY: "hidden",
							width: "100%",
						}}
						onChange={(event) => {
							const clonedData = { ...data };
							clonedData.actionDefinition.note =
								event.target.value;
							updateData(clonedData);
						}}
						onBlur={handleBlur}
					/>
				</Flex>
			</Card>

			<NodeToolbar position={Position.Bottom}>
				<Card style={{ padding: 0, paddingLeft: 2, paddingRight: 2 }}>
					<Flex align="center" width="auto">
						<NoteNodeToolbarButton
							hoverText="Header"
							onClick={() =>
								handleToolbarClick(MarkdownOperation.HEADER)
							}
							icon={
								<svg
									viewBox="0 0 16 16"
									width="14"
									height="14"
									style={{
										flex: "1 0 auto",
									}}
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="16"
										height="16"
										fill="none"
										viewBox="0 0 16 16"
									>
										<path
											stroke="currentColor"
											stroke-linecap="round"
											stroke-linejoin="round"
											d="M4.5 2.5v5m0 6v-6m7-5v5m0 6v-6m-7 0h7"
										></path>
									</svg>
								</svg>
							}
						/>

						<NoteNodeToolbarButton
							hoverText="Bold"
							onClick={() =>
								handleToolbarClick(MarkdownOperation.BOLD)
							}
							icon={
								<svg
									viewBox="0 0 16 16"
									width="13"
									height="13"
									style={{
										flex: "1 0 auto",
									}}
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="16"
										height="16"
										fill="none"
										viewBox="0 0 16 16"
									>
										<path
											stroke="currentColor"
											stroke-linecap="round"
											stroke-linejoin="round"
											d="M4.5 7.5v-5H8a2.5 2.5 0 0 1 0 5zm0 0v6h4a3 3 0 1 0 0-6z"
										></path>
									</svg>
								</svg>
							}
						/>

						<NoteNodeToolbarButton
							hoverText="Italic"
							onClick={() =>
								handleToolbarClick(MarkdownOperation.ITALIC)
							}
							icon={
								<svg
									viewBox="0 0 16 16"
									width="13"
									height="13"
									style={{
										flex: "1 0 auto",
									}}
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="16"
										height="16"
										fill="none"
										viewBox="0 0 16 16"
									>
										<path
											stroke="currentColor"
											stroke-linecap="round"
											d="m7.002 13.5 2-11m-2 11h-2m2 0h2m0-11h-2m2 0h2"
										></path>
									</svg>
								</svg>
							}
						/>

						<NoteNodeToolbarButton
							hoverText="Strikethrough"
							onClick={() =>
								handleToolbarClick(
									MarkdownOperation.STRIKETHROUGH,
								)
							}
							icon={
								<svg
									viewBox="0 0 16 16"
									width="16"
									height="16"
									style={{
										flex: "1 0 auto",
									}}
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="16"
										height="16"
										fill="none"
										viewBox="0 0 16 16"
									>
										<path
											fill="currentColor"
											fill-rule="evenodd"
											d="M7.499 3c-1.622 0-2.536.547-3.025 1.197a2.4 2.4 0 0 0-.466 1.16 2 2 0 0 0-.009.12v.018h.5-.5q0 .313.052.592c.066.354.2.656.374.913h1.459c-.43-.251-.758-.603-.85-1.095A2.2 2.2 0 0 1 5 5.5v-.003l.003-.035a1.422 1.422 0 0 1 .272-.665c.08-.106.19-.222.344-.332l4.38 1.03v.005a.5.5 0 0 0 1-.005h-.5l.5-.001v-.017a1 1 0 0 0-.008-.121 2.422 2.422 0 0 0-.467-1.16C10.036 3.547 9.122 3 7.5 3M5.618 4.466c.35-.249.924-.466 1.88-.466 1.38 0 1.965.451 2.226.798a1.4 1.4 0 0 1 .272.665l.003.033zm0 0-1.144-.269zm4.381 1.036ZM4.872 7.5H12a.5.5 0 0 1 0 1H3a.5.5 0 0 1 0-1zM10.604 9H9.236c.356.238.633.583.727 1.087q.035.181.036.404v.002l-.003.036q-.005.054-.03.159a1.4 1.4 0 0 1-.242.51c-.262.35-.848.802-2.225.802s-1.963-.453-2.225-.802a1.43 1.43 0 0 1-.272-.67l-.003-.035v-.003a.5.5 0 0 0-1 .006h.5-.5v.017a1 1 0 0 0 .009.122 2.435 2.435 0 0 0 .466 1.162C4.962 12.45 5.876 13 7.499 13s2.537-.55 3.025-1.203a2.43 2.43 0 0 0 .466-1.162 2 2 0 0 0 .009-.121v-.017l-.5-.001h.5q0-.312-.053-.592A2.6 2.6 0 0 0 10.604 9"
											clip-rule="evenodd"
										></path>
									</svg>
								</svg>
							}
						/>

						<NoteNodeToolbarButton
							hoverText="Link"
							onClick={() =>
								handleToolbarClick(MarkdownOperation.LINK)
							}
							icon={
								<svg
									viewBox="0 0 16 17"
									width="16"
									height="17"
									style={{
										flex: "1 0 auto",
									}}
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="16"
										height="16"
										fill="none"
										viewBox="0 0 16 17"
									>
										<path
											stroke="currentColor"
											stroke-linecap="round"
											d="m11.536 9.416.353-.353a3.5 3.5 0 1 0-4.95-4.95l-.353.354m2.828 7.07-.353.354a3.5 3.5 0 1 1-4.95-4.95l.354-.353m5.303-.356L6.233 9.767"
										></path>
									</svg>
								</svg>
							}
						/>

						<NoteNodeToolbarButton
							hoverText="Code"
							onClick={() =>
								handleToolbarClick(MarkdownOperation.CODE)
							}
							icon={
								<svg
									viewBox="0 0 16 16"
									width="17"
									height="17"
									style={{
										flex: "1 0 auto",
									}}
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="16"
										height="16"
										fill="none"
										viewBox="0 0 16 16"
									>
										<path
											stroke="currentColor"
											stroke-linecap="round"
											stroke-linejoin="round"
											d="m5.502 11.503-3.5-3.5 3.5-3.5m5 0 3.5 3.5-3.5 3.5"
										></path>
									</svg>
								</svg>
							}
						/>

						<NoteNodeToolbarButton
							hoverText="List"
							onClick={() =>
								handleToolbarClick(MarkdownOperation.LIST)
							}
							icon={
								<svg
									viewBox="0 0 16 16"
									width="18"
									height="18"
									style={{
										flex: "1 0 auto",
									}}
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="16"
										height="16"
										fill="none"
										viewBox="0 0 16 16"
									>
										<path
											stroke="currentColor"
											stroke-linecap="round"
											stroke-linejoin="round"
											d="M12.503 4.5h-5m5 3h-5m5 3h-5m-3-6h-1m1 3h-1m1 3h-1"
										></path>
									</svg>
								</svg>
							}
						/>

						<NoteNodeToolbarButton
							hoverText="Ordered List"
							onClick={() =>
								handleToolbarClick(
									MarkdownOperation.ORDERED_LIST,
								)
							}
							icon={
								<svg
									viewBox="0 0 16 16"
									width="16"
									height="16"
									style={{
										flex: "1 0 auto",
									}}
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="16"
										height="16"
										fill="none"
										viewBox="0 0 16 16"
									>
										<path
											stroke="currentColor"
											stroke-linecap="round"
											stroke-linejoin="round"
											d="M4 6.499v-4l-1 .497m1 3.503H3m1 0h1m0 5.997H2.5c0-1.5 2.5-1.5 2.5-3s-2.5-1.5-2.5 0M12.502 4.5h-5m5 3h-5m5 3h-5"
										></path>
									</svg>
								</svg>
							}
						/>

						<NoteNodeToolbarButton
							hoverText="Checklist"
							onClick={() =>
								handleToolbarClick(MarkdownOperation.CHECKLIST)
							}
							icon={
								<svg
									viewBox="0 0 16 16"
									width="16"
									height="16"
									style={{
										flex: "1 0 auto",
									}}
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="16"
										height="16"
										fill="none"
										viewBox="0 0 16 16"
									>
										<path
											stroke="currentColor"
											stroke-linecap="round"
											stroke-linejoin="round"
											d="m5 8 2 2 4-4M4.503 2.5h7a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2"
										></path>
									</svg>
								</svg>
							}
						/>

						<NoteNodeToolbarButton
							hoverText="Delete"
							onClick={() => deleteNode()}
							icon={<TrashIcon color="var(--accent-a11)" />}
						/>
					</Flex>
				</Card>
			</NodeToolbar>
		</>
	);
}

interface NoteNodeToolbarButtonProps {
	onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
	icon: React.ReactNode;
	hoverText: string;
}

function NoteNodeToolbarButton({
	onClick,
	icon,
	hoverText,
}: NoteNodeToolbarButtonProps) {
	return (
		<Flex width="32px" height="32px" justify="center" align="center">
			<HoverCard.Root>
				<HoverCard.Trigger>
					<Button
						variant="ghost"
						style={{
							cursor: "pointer",
							padding: 0,
							width: "100%",
							height: "100%",
						}}
						onClick={onClick}
					>
						{icon}
					</Button>
				</HoverCard.Trigger>

				<HoverCard.Content style={{ padding: 0 }}>
					<Badge size="3" color="gray">
						{hoverText}
					</Badge>
				</HoverCard.Content>
			</HoverCard.Root>
		</Flex>
	);
}

function NoteNodeComponentBase({ id, data, selected }: NodeProps<NoteData>) {
	return (
		<>
			<NoteNode id={id} data={data} selected={selected} />
		</>
	);
}

export default memo(NoteNodeComponentBase);
