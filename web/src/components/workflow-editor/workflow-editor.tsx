"use client";

import { useGetWorkflowApi } from "@/hooks/use-get-workflow-api";
import { useListEditorActionsApi } from "@/hooks/use-list-editor-actions-api";
import { useEditorActionStore } from "@/stores/editor-action-store";
import { useWorkflowStore } from "@/stores/workflow-store";
import { Box, Flex, Grid, Tabs, Text } from "@radix-ui/themes";
import Link from "next/link";
import { useEffect, useState } from "react";
import SaveWorkflowButton from "../save-workflow-button/save-workflow-button";
import PublishWorkflowToggleEditor from "../publish-workflow-toggle/publish-workflow-toggle-editor";
import BackIcon from "@/components/icons/back-icon";
import WorkflowEditorBuilder from "./workflow-editor-builder";
import WorkflowEditorActionsSidebar from "./workflow-editor-actions-sidebar";
import { prepareForReactFlow } from "@/lib/reactflow";
import WorkflowSettingsButton from "./workflow-settings-button";
import WorkflowEditorActionEditSidebar from "./workflow-editor-action-edit-sidebar";
import WorkflowRunHistory from "./run-history/workflow-run-history";
import RunWorkflowButton from "../run-workflow/run-workflow-button";
import { errorToast } from "@/lib/toast";
import { AxiosError } from "axios";
import { useRouter } from "next/navigation";

type View = "workflowBuilder" | "runHistory";

export default function WorkflowEditor({
	workflowId,
	apiBaseUrl,
}: {
	workflowId: string;
	apiBaseUrl: string;
}) {
	const router = useRouter();

	const [view, setView] = useState<View>("workflowBuilder");

	const { isNew, setWorkflow, clearWorkflowStore } = useWorkflowStore();
	const { setEditorActions } = useEditorActionStore();

	// Loading Actions
	const {
		data: editorActions,
		isPending: isLoadingEditorActions,
		error: editActionsError,
	} = useListEditorActionsApi();

	useEffect(() => {
		if (editorActions) {
			setEditorActions(editorActions);
		}
		if (editActionsError) {
			errorToast("Failed to load actions. Please refresh the page.");
		}
	}, [editorActions, setEditorActions, editActionsError]);

	// Load Workflow
	// Note: we only load from the DB if the workflow is not newly created
	const {
		data: workflow,
		isPending: isLoadingWorkflow,
		error: workflowError,
	} = useGetWorkflowApi(workflowId, !isNew);

	useEffect(() => {
		if (workflow) {
			setWorkflow(prepareForReactFlow(workflow, window.innerWidth));
		}
		if (workflowError) {
			if (
				workflowError instanceof AxiosError &&
				(workflowError as AxiosError).response?.status === 404
			) {
				router.replace("/");
				errorToast("Workflow does not exist.");
			} else {
				errorToast("Failed to load workflow. Please refresh the page.");
			}
		}

		if (workflow || isNew) {
			// clean up store when component unmounts
			// Important! This requires ReactStrictMode to be set to false
			// because the strict mode mounts every component twice, i.e.,
			// we will have one unmount which then resets the isNew flag.
			// This causes our logic to break because the workflow store
			// is reset.
			return () => clearWorkflowStore();
		}
	}, [
		workflow,
		setWorkflow,
		isNew,
		workflowError,
		clearWorkflowStore,
		router,
	]);

	// TODO(frontend): nicer loading screen
	if (isLoadingEditorActions || (!isNew && isLoadingWorkflow)) {
		return <Box>Loading...</Box>;
	}

	return (
		<Grid rows="50px 1fr" width="auto" height="100%" align="center">
			<Box width="100%" height="100%">
				<Grid
					pb="2"
					pt="2"
					pl="4"
					pr="4"
					columns="1fr 200px 1fr"
					className="border-b-2 border-gray-200"
					align="center"
					height="56px"
					width="calc(100% - 56px)"
					style={{
						position: "fixed",
						backgroundColor: "white",
						zIndex: 100,
					}}
				>
					<Flex justify="start" align="center" gap="4">
						<Link href="/">
							<BackIcon />
						</Link>

						<Text size="4" weight="medium">
							Workflow Editor
						</Text>
					</Flex>

					<Flex justify="center" align="center">
						<Tabs.Root
							value={view}
							onValueChange={(page) => setView(page as View)}
						>
							<Tabs.List size="1">
								<Tabs.Trigger
									value="workflowBuilder"
									style={{ cursor: "pointer" }}
								>
									Workflow Builder
								</Tabs.Trigger>
								<Tabs.Trigger
									value="runHistory"
									style={{ cursor: "pointer" }}
								>
									Run History
								</Tabs.Trigger>
							</Tabs.List>
						</Tabs.Root>
					</Flex>

					<Flex justify="end" align="center" gap="3">
						<RunWorkflowButton />

						<SaveWorkflowButton />

						<WorkflowSettingsButton />

						<Box width="105px">
							<PublishWorkflowToggleEditor />
						</Box>
					</Flex>
				</Grid>
			</Box>

			<WorkflowEditorActionEditSidebar apiBaseUrl={apiBaseUrl} />

			<Box height="100%" width="100%">
				{view === "workflowBuilder" && (
					<>
						<WorkflowEditorBuilder />
						<WorkflowEditorActionsSidebar />
					</>
				)}
				{view === "runHistory" && (
					<WorkflowRunHistory workflowId={workflowId} />
				)}
			</Box>
		</Grid>
	);
}