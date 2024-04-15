import { Button } from "@radix-ui/themes";

export default function LogoutButton() {
	return (
		<form action="/auth/signout" method="post">
			<Button
				type="submit"
				variant="solid"
				color="red"
				style={{ cursor: "pointer" }}
			>
				Logout
			</Button>
		</form>
	);
}
