import { getServerSession } from "next-auth/next";

import { authOptions } from "@/lib/auth";

export async function getCurrentUser() {
	const session = await getServerSession(authOptions);
	console.log("SESSION: ", session); // FIXME:
	return session?.user;
}
