import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import prisma from "@/lib/prisma";
import authConfig from "./auth.config";
import { AUTH_SECRET } from "./constants/env";

export const { handlers, signIn, signOut, auth } = NextAuth({
	adapter: PrismaAdapter(prisma),
	secret: AUTH_SECRET,
	...authConfig,
	session: { strategy: "jwt" },
});
