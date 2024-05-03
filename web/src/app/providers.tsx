"use client";

import posthog from "posthog-js";
import { PostHogProvider } from "posthog-js/react";

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
	});
}

export function CSPostHogProvider({ children }: { children: React.ReactNode }) {
	return <PostHogProvider client={posthog}>{children}</PostHogProvider>;
}
