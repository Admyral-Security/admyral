import { AUTH_SECRET, GITHUB_CLIENT_ID, GITHUB_SECRET } from "@/constants/env";
import { NextAuthOptions } from "next-auth";
import GitHub from "next-auth/providers/github";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import prisma from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
	// Configure one or more authentication providers
	adapter: PrismaAdapter(prisma),
	providers: [
		GitHub({
			clientId: GITHUB_CLIENT_ID!,
			clientSecret: GITHUB_SECRET!,
		}),
	],
	pages: {
		signIn: "/login",
	},
	session: {
		strategy: "jwt",
		maxAge: 30 * 24 * 60 * 60, // 30 days
	},
	secret: AUTH_SECRET,
	callbacks: {
		// async session({ token, session }) {
		// 	console.log("AUTH.TS SESSION:", { token, session }); // FIXME:

		// 	const dbUser = await prisma.user.findUnique({
		// 		where: {
		// 			id: token.email!.toLowerCase(),
		// 		},
		// 	});
		// 	console.log("AUTH.TS SESSION: ", { dbUser }); // FIXME:

		// 	const result = {
		// 		...session,
		// 		user:
		// 			dbUser !== null
		// 				? {
		// 						id: dbUser.id,
		// 						name: dbUser.name,
		// 						email: dbUser.email,
		// 						image: dbUser.image,
		// 					}
		// 				: null,
		// 	};

		// 	console.log("AUTH.TS SESSION: ", { result }); // FIXME:

		// 	return result;
		// },
		async session({ token, session }) {
			console.log("AUTH.TS SESSION: ", { token, session }); // FIXME:
			if (!token.userExists) {
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
			console.log("AUTH.TS SESSION RESULT: ", session); // FIXME:
			return session;
		},
		async jwt({ token, user }) {
			console.log("AUTH.TS JWT: ", { token, user }); // FIXME:
			if (user) {
				// This is only called on initial sign in, i.e.,
				// the user is only defined on initial sign in
				// otherwise the user is undefined.
				token.sub = user.id;
			}
			// On subsequent calls, token.sub will be defined
			const dbUser = await prisma.user.findUnique({
				where: {
					id: token.sub,
				},
			});
			if (dbUser) {
				token.userExists = true;
				token.email = dbUser.email;
				token.name = dbUser.name;
				token.picture = dbUser.image;
			} else {
				token.userExists = false;
			}
			return token;
		},
	},
};
