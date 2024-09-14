import GitHub from "next-auth/providers/github";
import type { NextAuthConfig } from "next-auth";
import type { Provider } from "next-auth/providers";

const providers: Provider[] = [
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
	GitHub,
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
		authorized: ({ request, auth }) => {
			// You can add custom logic here, for example, check roles
			return !!auth?.user; // if token exists, the user is authenticated
		},
	},
	debug: process.env.NODE_ENV !== "production" ? true : false,
} satisfies NextAuthConfig;
