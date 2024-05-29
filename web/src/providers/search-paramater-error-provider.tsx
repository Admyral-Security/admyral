"use client";

import { useParams, useRouter } from "next/navigation";
import {
	createContext,
	useContext,
	useCallback,
	useState,
	useEffect,
} from "react";

type SearchParameterErrorContextType = {
	error: string | null;
	resetError: () => void;
};

export const SearchParameterErrorContext =
	createContext<SearchParameterErrorContextType>({
		error: null,
		resetError: () => {},
	});

interface SearchParameterErrorProviderProps {
	children: React.ReactNode;
}

export function SearchParameterErrorProvider({
	children,
}: SearchParameterErrorProviderProps) {
	const { error: paramError } = useParams<{ error?: string }>();
	const router = useRouter();

	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (paramError !== undefined) {
			setError(paramError);

			// Remove the error parameter from the URL
			const params = new URLSearchParams(window.location.search);
			params.delete("error");
			router.replace(`?${params.toString()}`);
		}
	}, [paramError, router]);

	const resetError = useCallback(() => {
		setError(null);
	}, [paramError]);

	return (
		<SearchParameterErrorContext.Provider value={{ error, resetError }}>
			{children}
		</SearchParameterErrorContext.Provider>
	);
}

export default function useSearchParameterError() {
	const context = useContext(SearchParameterErrorContext);
	if (context === undefined) {
		throw new Error(
			"useSearchParameterError must be used within a SearchParameterErrorProvider",
		);
	}
	return context;
}
