"use client";

import { Button } from "@radix-ui/themes";
// import { signOut } from "@/auth";
import { useSession, signIn, signOut } from "next-auth/react";

export default function SignOutButton() {
	return (
		<Button
			onClick={() =>
				signOut({
					callbackUrl: "/login",
					redirect: false,
				})
			}
			type="submit"
			variant="solid"
			color="red"
			style={{ cursor: "pointer" }}
		>
			Sign Out
		</Button>
	);
}
