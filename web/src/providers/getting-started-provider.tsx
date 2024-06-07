"use client";

import GettingStartedModal from "@/components/getting-started-modal";
import { createNewWorkflow, loadWorkflowTemplates } from "@/lib/api";
import { errorToast, successToast } from "@/lib/toast";
import { WorkflowTemplate } from "@/lib/types";
import { useSearchParams, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";

type GettingStartDialogContextType = {
	openGettingStartedDialog: () => void;
};

const GettingStartedDialogContext =
	createContext<GettingStartDialogContextType>({
		openGettingStartedDialog: () => {},
	});

interface GettingStartedDialogProviderProps {
	children: React.ReactNode;
}

export function GettingStartedDialogProvider({
	children,
}: GettingStartedDialogProviderProps) {
	const [open, setOpen] = useState<boolean>(false);

	const [loading, setLoading] = useState<boolean>(false);
	const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);

	const searchParams = useSearchParams();
	const router = useRouter();

	useEffect(() => {
		if (open) {
			const isFirstLogin = searchParams.get("isFirstLogin");
			if (isFirstLogin !== null) {
				const params = new URLSearchParams(window.location.search);
				params.delete("isFirstLogin");
				router.replace(`?${params.toString()}`);
			}
		}
	}, [open, searchParams, router]);

	useEffect(() => {
		loadWorkflowTemplates()
			.then((templates) => {
				setTemplates(templates);
			})
			.catch((error) => {
				errorToast(
					"Failed to load workflow templates. Please refresh the page.",
				);
			});
	}, []);

	const handleCreateNewWorkflow = async () => {
		setLoading(true);
		try {
			await createNewWorkflow();
			successToast("New workflow created successfully.");
			setOpen(false);
		} catch (error) {
			errorToast("Failed to create new workflow. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	return (
		<>
			<GettingStartedDialogContext.Provider
				value={{ openGettingStartedDialog: () => setOpen(true) }}
			>
				{children}
			</GettingStartedDialogContext.Provider>

			<GettingStartedModal
				open={open}
				setOpen={setOpen}
				templates={templates}
				loading={loading}
				handleCreateNewWorkflow={handleCreateNewWorkflow}
			/>
		</>
	);
}

export default function useGettingStartedDialog() {
	const context = useContext(GettingStartedDialogContext);
	if (context === undefined) {
		throw new Error(
			"useWelcomeDialog must be used within a GettingStartedDialogProvider",
		);
	}
	return context;
}
