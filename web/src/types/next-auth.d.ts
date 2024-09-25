import { User } from "next-auth";
import { JWT } from "next-auth/jwt";

type UserId = string;

declare module "next-auth" {
	interface Session {
		user:
			| (User & {
					id: UserId;
			  })
			| null;
		userExists: boolean;
	}
}
