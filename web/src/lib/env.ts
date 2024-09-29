"use server";

import { unstable_noStore as noStore } from "next/cache";

export async function isAuthDisabled() {
	noStore();
	return (process.env.ADMYRAL_DISABLE_AUTH || "false") === "true";
}
