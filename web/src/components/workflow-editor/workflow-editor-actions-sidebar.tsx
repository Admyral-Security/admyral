"use client";

import { useEditorActionStore } from "@/stores/editor-action-store";
import { Card, Flex, ScrollArea } from "@radix-ui/themes";
import ActionAccordion from "./action-accordion";

export default function WorkflowEditorActionsSidebar() {
	const { editorActions } = useEditorActionStore();
	if (editorActions === null) {
		return null;
	}
	return (
		<Card
			style={{
				position: "fixed",
				left: "68px",
				top: "68px",
				zIndex: 50,
				width: "270px",
				backgroundColor: "white",
				height: "calc(99vh - 68px)",
				padding: 0,
			}}
			size="4"
		>
			<ScrollArea
				type="hover"
				scrollbars="vertical"
				style={{ height: "100%", width: "100%" }}
			>
				<Flex
					direction="column"
					gap="2"
					width="100%"
					height="100%"
					pt="4"
					pl="4"
					pr="4"
					pb="4"
					style={{
						display: "flex",
						flexDirection: "column",
					}}
				>
					{editorActions.namespaces.map((namespace, idx) => (
						<ActionAccordion
							key={`action_accordion_${idx}`}
							actionNamespace={namespace}
						/>
					))}
				</Flex>
			</ScrollArea>
		</Card>
	);
}
