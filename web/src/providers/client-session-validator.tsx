"use client";

import { signOut, useSession } from "next-auth/react";
import { ReactNode, useEffect } from "react";

export default function ClientSessionValidator({
	isAuthDisabled,
	children,
}: {
	isAuthDisabled: boolean;
	children: ReactNode;
}) {
	const { data: session, status } = useSession();

	// We automatically sign out the user and clear the cookies if the user
	// does not exist anymore in the database.
	useEffect(() => {
		if (isAuthDisabled) {
			return;
		}

		if (status === "loading") {
			return;
		}
		if (!session?.userExists) {
			signOut({
				callbackUrl: "/login",
			});
		}
	}, [session, status, isAuthDisabled]);

	return children;
}
