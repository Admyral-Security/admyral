import { Button } from "@radix-ui/themes";
import { signOut } from "@/auth";

export default function SignOutButton() {
	return (
		<form
			action={async () => {
				"use server";
				await signOut({
					redirectTo: "/login",
				});
			}}
		>
			<Button
				type="submit"
				variant="solid"
				color="red"
				style={{ cursor: "pointer" }}
			>
				Sign Out
			</Button>
		</form>
	);
}
