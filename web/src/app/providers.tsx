"use client";

import { createClient } from "@/utils/supabase/client";
import posthog from "posthog-js";
import { PostHogProvider } from "posthog-js/react";
import { useEffect } from "react";

if (
	typeof window !== "undefined" &&
	process.env.NEXT_PUBLIC_POSTHOG_KEY &&
	process.env.NEXT_PUBLIC_POSTHOG_HOST
) {
	posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
		api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
		// Enable debug mode in development
		loaded: (posthog) => {
			if (process.env.NODE_ENV === "development") {
				posthog.debug();
			}
		},
		// Following: https://posthog.com/tutorials/cookieless-tracking
		persistence: "memory",
		ip: false,
	});
}

export function CSPostHogProvider({ children }: { children: React.ReactNode }) {
	return <PostHogProvider client={posthog}>{children}</PostHogProvider>;
}

export const posthogHelpers = {
	identify: async () => {
		const supabase = createClient();
		const {
			data: { user },
			error,
		} = await supabase.auth.getUser();
		if (error || !user) {
			return;
		}
		posthog.identify(user.id);
	},
	logout: () => {
		posthog.reset();
	},
};

export default function PostHogIdentifierProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	useEffect(() => {
		posthogHelpers.identify();
	}, []);

	return children;
}
