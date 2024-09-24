import "next-auth/jwt";
import GitHub from "next-auth/providers/github";
import type { NextAuthConfig, Session } from "next-auth";
import type { Provider } from "next-auth/providers";
import { GITHUB_CLIENT_ID, GITHUB_SECRET } from "./constants/env";
import prisma from "./lib/prisma";

export const providers: Provider[] = [
	// Credentials({
	// 	// You can specify which fields should be submitted, by adding keys to the `credentials` object.
	// 	// e.g. domain, username, password, 2FA token, etc.
	// 	credentials: {
	// 		email: {
	// 			label: "Email",
	// 			type: "email",
	// 			placeholder: "jsmith@example.com",
	// 		},
	// 		password: { label: "Password", type: "password" },
	// 	},
	// 	authorize: async (credentials) => {
	// 		let user = null;
	// 		// logic to salt and hash password
	// 		// TODO: salt and hash password
	// 		//   const pwHash = saltAndHashPassword(credentials.password)
	// 		// logic to verify if the user exists
	// 		// TODO:
	// 		//   user = await getUserFromDb(credentials.email, pwHash)
	// 		if (!user) {
	// 			// No user found, so this is their first attempt to login
	// 			// meaning this is also the place you could do registration
	// 			// TODO: handle registration
	// 			throw new Error("User not found.");
	// 		}
	// 		// return user object with their profile data
	// 		return user;
	// 	},
	// }),
	GitHub({
		clientId: GITHUB_CLIENT_ID,
		clientSecret: GITHUB_SECRET,
	}),
];

export const providerMap = providers
	.map((provider) => {
		if (typeof provider === "function") {
			const providerData = provider();
			return { id: providerData.id, name: providerData.name };
		} else {
			return { id: provider.id, name: provider.name };
		}
	})
	.filter((provider) => provider.id !== "credentials");

export default {
	providers,
	session: { strategy: "jwt" },
	// events: {},
	pages: {
		// Sign in error types: see SignInPageErrorParam
		signIn: "/signin",
		// Available error types: see ErrorPageParam
		error: "/error",
		signOut: "/settings",
		// verify request page => if user needs to confirm her/his email
		// verifyRequest: "...",
		newUser: "/",
	},
	callbacks: {
		// authorized: ({ request, auth }) => {
		// 	// You can add custom logic here, for example, check roles
		// 	return !!auth?.user; // if token exists, the user is authenticated
		// },
		// async session({ session, token }): Promise<Session> {
		// 	if (token) {
		// 		session.user.id = token.id as string;
		// 	}

		// 	const user = await prisma.user.findUnique({
		// 		where: {
		// 			email: session.user.email,
		// 		},
		// 	});

		// 	// // Check if the user still exists in the database
		// 	// try {
		// 	// 	const user = await prisma.user.findFirst({
		// 	// 		where: {
		// 	// 			id: session.user.id,
		// 	// 		},
		// 	// 	});
		// 	// 	if (!user) {
		// 	// 		// If the user doesn't exist, return null to invalidate the session
		// 	// 		return null;
		// 	// 	}
		// 	// } catch (error) {
		// 	// 	console.error("Error fetching user:", error);
		// 	// 	// In case of an error, we might want to err on the side of caution and invalidate the session
		// 	// 	return null;
		// 	// }

		// 	return session;
		// },
		// authorized({ request, auth }) {
		// 	// const { pathname } = request.nextUrl;
		// 	// if (pathname === "/middleware-example") return !!auth;
		// 	// return true;
		// 	return !!auth;
		// },
		jwt({ token, trigger, session, account }) {
			console.log("AUTH CONFIG JWT - account: ", account); // FIXME:
			console.log("AUTH CONFIG JWT - token: ", token); // FIXME:
			console.log("AUTH CONFIG JWT - session: ", session); // FIXME:
			if (trigger === "update") token.name = session.user.name;
			if (account?.provider === "keycloak") {
				return { ...token, accessToken: account.access_token };
			}
			return token;
		},
		async session({ session, token }) {
			if (token?.accessToken) {
				session.accessToken = token.accessToken;
			}
			console.log("AUTH CONFIG SESSION: ", session); // FIXME:
			console.log("AUTH CONFIG TOKEN: ", token); // FIXME:
			return session;
		},
	},
	debug: process.env.NODE_ENV !== "production" ? true : false,
} satisfies NextAuthConfig;

declare module "next-auth" {
	interface Session {
		accessToken?: string;
	}
}

declare module "next-auth/jwt" {
	interface JWT {
		accessToken?: string;
	}
}
