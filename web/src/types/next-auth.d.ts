import { User } from "next-auth";
import { JWT } from "next-auth/jwt";

type UserId = string;

declare module "next-auth/jwt" {
	interface JWT {
		id?: UserId | null;
		name?: string | null;
		email?: string | null;
		image?: string | null;
	}
}

declare module "next-auth" {
	interface Session {
		user:
			| (User & {
					id: UserId;
			  })
			| null;
	}
}
