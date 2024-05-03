"use client";

import { Button } from "@radix-ui/themes";
import { posthogHelpers } from "@/app/providers";

export default function LogoutButton() {
	return (
		<form action="/auth/signout" method="post">
			<Button
				type="submit"
				variant="solid"
				color="red"
				style={{ cursor: "pointer" }}
				onClick={() => posthogHelpers.logout()}
			>
				Logout
			</Button>
		</form>
	);
}
