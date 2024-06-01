import { createContext, useContext, useEffect, useState } from "react";

type CsrfTokenContextType = {
	csrfToken: string | null;
};

const CsrfTokenContext = createContext<CsrfTokenContextType>({
	csrfToken: null,
});

interface CsrfTokenProviderProps {
	children: React.ReactNode;
}

export function CsrfTokenProvider({ children }: CsrfTokenProviderProps) {
	const [csrfToken, setCsrfToken] = useState<string | null>(null);

	useEffect(() => {
		fetch("/api/csrf-token", { method: "GET" }).then((res) =>
			res.json().then((data) => setCsrfToken(data.state)),
		);
	}, []);

	return (
		<CsrfTokenContext.Provider value={{ csrfToken }}>
			{children}
		</CsrfTokenContext.Provider>
	);
}

export default function useCsrfToken() {
	const context = useContext(CsrfTokenContext);
	if (context === undefined) {
		throw new Error("useCsrfToken must be used within a CsrfTokenProvider");
	}
	return context;
}
