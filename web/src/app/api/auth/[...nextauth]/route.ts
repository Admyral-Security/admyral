import NextAuth from "next-auth";

import { authOptions } from "@/lib/auth";
import { NextApiRequest, NextApiResponse } from "next";

// async function handler(req: NextApiRequest, res: NextApiResponse) {
// 	// https://github.com/nextauthjs/next-auth/issues/2408#issuecomment-1382629234
// 	// res.setHeader("Cache-Control", "no-store, max-age=0");
// 	return NextAuth(req, res, authOptions);
// }

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
