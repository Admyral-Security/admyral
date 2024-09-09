import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import prisma from "@/lib/prisma";
import authConfig from "./auth.config";

export const { handlers, signIn, signOut, auth } = NextAuth({
	// providers: [
	// 	// Credentials({
	// 	// 	// You can specify which fields should be submitted, by adding keys to the `credentials` object.
	// 	// 	// e.g. domain, username, password, 2FA token, etc.
	// 	// 	credentials: {
	// 	// 		email: {
	// 	// 			label: "Email",
	// 	// 			type: "email",
	// 	// 			placeholder: "jsmith@example.com",
	// 	// 		},
	// 	// 		password: { label: "Password", type: "password" },
	// 	// 	},
	// 	// 	authorize: async (credentials) => {
	// 	// 		let user = null;

	// 	// 		// logic to salt and hash password
	// 	// 		// TODO: salt and hash password
	// 	// 		//   const pwHash = saltAndHashPassword(credentials.password)

	// 	// 		// logic to verify if the user exists
	// 	// 		// TODO:
	// 	// 		//   user = await getUserFromDb(credentials.email, pwHash)

	// 	// 		if (!user) {
	// 	// 			// No user found, so this is their first attempt to login
	// 	// 			// meaning this is also the place you could do registration
	// 	// 			// TODO: handle registration
	// 	// 			throw new Error("User not found.");
	// 	// 		}

	// 	// 		// return user object with their profile data
	// 	// 		return user;
	// 	// 	},
	// 	// }),
	// 	GitHub,
	// ],
	session: { strategy: "jwt" },
	adapter: PrismaAdapter(prisma),
	secret: process.env.AUTH_SECRET,
	...authConfig,
});
