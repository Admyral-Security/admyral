"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
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

const SearchParameterErrorContext =
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
	const searchParams = useSearchParams();
	const router = useRouter();

	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const paramError = searchParams.get("error");
		if (paramError !== null) {
			setError(paramError);

			// Remove the error parameter from the URL
			const params = new URLSearchParams(window.location.search);
			params.delete("error");
			router.replace(`?${params.toString()}`);
		}
	}, [searchParams, router]);

	const resetError = useCallback(() => {
		setError(null);
	}, [searchParams]);

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
