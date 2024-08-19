"use client";

import { useEditorActionStore } from "@/stores/editor-action-store";
import IfConditionActionIcon from "../icons/if-condition-action-icon";
import NoteActionIcon from "../icons/note-action-icon";
import StartWorkflowActionIcon from "../icons/start-workflow-icon";
import TransformActionIcon from "../icons/transform-action-icon";
import Image from "next/image";
import NamespaceIcon from "./namespace-icon";

export default function ActionIcon({ actionType }: { actionType: string }) {
	const { queryActionByActionType } = useEditorActionStore();

	switch (actionType) {
		case "start":
			return <StartWorkflowActionIcon />;

		case "transform":
			return <TransformActionIcon />;

		case "if_condition":
			return <IfConditionActionIcon />;

		case "python":
		case "for_loop":
			return (
				<Image
					src="/python_logo.svg"
					alt="Python"
					height={18}
					width={18}
				/>
			);

		case "note":
			return <NoteActionIcon />;
	}

	const actionMetadata = queryActionByActionType(actionType);
	if (!actionMetadata) {
		// TODO: action does not exist - should not happen
		return null;
	}
	const namespace = actionMetadata?.displayNamespace;
	return namespace ? <NamespaceIcon namespace={namespace} /> : null;
}
