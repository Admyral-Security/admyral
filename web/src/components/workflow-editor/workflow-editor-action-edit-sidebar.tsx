"use client";

import { useWorkflowStore } from "@/stores/workflow-store";
import { useEffect } from "react";
import WorkflowSettingsEditPanel from "./workflow-settings-edit-panel";
import ActionEditPanel from "./edit-panel/action-edit-panel";
import StartActionEditPanel from "./edit-panel/start-action-edit-panel";
import IfConditionEditPanel from "./edit-panel/if-condition-edit-panel";
import LoopEditPanel from "./edit-panel/loop-edit-panel";

export default function WorkflowEditorActionEditSidebar({
	apiBaseUrl,
}: {
	apiBaseUrl: string;
}) {
	const { nodes, detailPageType, selectedNodeIdx, setSelectedNode } =
		useWorkflowStore();

	useEffect(() => {
		const newSelectedNodeIdx = nodes.findIndex((node) => node.selected);
		if (
			(detailPageType === "workflow" && newSelectedNodeIdx === -1) ||
			newSelectedNodeIdx === selectedNodeIdx
		) {
			return;
		}

		setSelectedNode(newSelectedNodeIdx);
	}, [nodes, detailPageType, selectedNodeIdx, setSelectedNode]);

	if (
		detailPageType === null ||
		(detailPageType === "action" && selectedNodeIdx === null)
	) {
		// No detail page selected.
		return null;
	}

	if (detailPageType === "workflow") {
		return <WorkflowSettingsEditPanel />;
	}

	const actionData = nodes[selectedNodeIdx!].data;
	const actionType = actionData.actionType;

	if (actionType === "start") {
		return <StartActionEditPanel apiBaseUrl={apiBaseUrl} />;
	}
	if (actionType === "if_condition") {
		return <IfConditionEditPanel />;
	}
	if (actionType === "loop") {
		return <LoopEditPanel />;
	}
	return <ActionEditPanel />;
}
