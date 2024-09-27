import NextAuth from "next-auth";

import { authOptions } from "@/lib/auth";

// https://github.com/nextauthjs/next-auth/issues/2408#issuecomment-1382629234
// PR to fix it: https://github.com/nextauthjs/next-auth/pull/11667
// Make sure that no request is cached - only a problem with CDN which tries to
// cache GET /session
export const dynamic = "force-dynamic";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
