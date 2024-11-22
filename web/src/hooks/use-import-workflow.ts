"use client";

import { useMutation } from "@tanstack/react-query";
import { HTTPMethod } from "@/types/api";
import { useState } from "react";
import { useRouter } from "next/navigation";

// POST /api/v1/workflows/import
function useImportWorkflowApi() {
	return useMutation({
		mutationFn: async ({ file }: { file: File }) => {
			const formData = new FormData();
			formData.append("file", file);

			const response = await fetch(`/api/v1/workflows/import`, {
				method: HTTPMethod.POST,
				body: formData,
			});
			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.detail);
			}

			const workflowId = await response.json();
			return workflowId;
		},
	});
}

export function useImportWorkflow() {
	const importWorkflowApi = useImportWorkflowApi();
	const [isPending, setIsPending] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const router = useRouter();

	const importWorkflow = async (file: File) => {
		try {
			setIsPending(true);
			setErrorMessage(null);

			const workflowId = await importWorkflowApi.mutateAsync({ file });
			router.push(`/editor/${workflowId}`);
		} catch (error) {
			if (error instanceof Error) {
				setErrorMessage(error.message);
			} else {
				setErrorMessage(
					"An unexpected error occurred while importing the workflow. Please try again or contact support.",
				);
			}
		} finally {
			setIsPending(false);
		}
	};

	return { importWorkflow, isPending, errorMessage };
}
