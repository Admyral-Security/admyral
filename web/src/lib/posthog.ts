import { PostHog } from "posthog-node";

export class ServerPosthog extends PostHog {
	constructor() {
		super(process.env.NEXT_PUBLIC_POSTHOG_KEY as string, {
			host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
		});

		if (process.env.NODE_ENV === "development") this.debug();
	}
}

export default function useServerPostHog() {
	if (
		!process.env.NEXT_PUBLIC_POSTHOG_KEY ||
		!process.env.NEXT_PUBLIC_POSTHOG_HOST
	) {
		throw new Error("PostHog key and/or host not set");
	}

	return new ServerPosthog();
}
