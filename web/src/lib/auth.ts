import {
	AUTH_SECRET,
	GITHUB_CLIENT_ID,
	GITHUB_SECRET,
	GOOGLE_CLIENT_ID,
	GOOGLE_CLIENT_SECRET,
} from "@/constants/env";
import { NextAuthOptions } from "next-auth";
import GitHub from "next-auth/providers/github";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import prisma from "@/lib/prisma";
import { type Provider } from "next-auth/providers/index";
import Google from "next-auth/providers/google";

export const providers: Provider[] = [];

if (GITHUB_CLIENT_ID && GITHUB_SECRET) {
	providers.push(
		GitHub({
			clientId: GITHUB_CLIENT_ID,
			clientSecret: GITHUB_SECRET,
		}),
	);
}

if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
	providers.push(
		Google({
			clientId: GOOGLE_CLIENT_ID,
			clientSecret: GOOGLE_CLIENT_SECRET,
		}),
	);
}

export const providerMap = providers
	.map((provider) => {
		// if (typeof provider === "function") {
		// 	const providerData = provider();
		// 	return { id: providerData.id, name: providerData.name };
		// } else {
		// 	return { id: provider.id, name: provider.name };
		// }
		return { id: provider.id, name: provider.name };
	})
	.filter((provider) => provider.id !== "credentials");

export const authOptions: NextAuthOptions = {
	// Configure one or more authentication providers
	adapter: PrismaAdapter(prisma),
	providers,
	pages: {
		signIn: "/login",
		error: "/login",
	},
	session: {
		strategy: "jwt",
		maxAge: 30 * 24 * 60 * 60, // 30 days
	},
	secret: AUTH_SECRET,
	debug: process.env.NODE_ENV !== "production",
	callbacks: {
		async session({ token, session }) {
			const dbUser = await prisma.user.findUnique({
				where: {
					id: token.sub,
				},
			});

			if (!dbUser) {
				// If the user doesn't exist, we'll set a flag on the session
				session.userExists = false;
				// Clear user data from the session
				session.user = { id: "", name: "", email: "", image: "" };
				return session;
			}

			session.userExists = true;
			if (token && session.user) {
				session.user.id = token.sub as string;
				session.user.email = token.email;
				session.user.name = token.name;
				session.user.image = token.picture as string | null;
			}
			return session;
		},
		async jwt({ token, user }) {
			if (user) {
				// This is only called on initial sign in, i.e.,
				// the user is only defined on initial sign in
				// otherwise the user is undefined.
				token.sub = user.id;
			}
			return token;
		},
	},
};
