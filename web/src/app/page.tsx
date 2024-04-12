import Link from "next/link";

export default async function Home() {
	return (
		<div>
			<p>Welcome back!</p>
			<p>Workflow Overview</p>
			<p>Check out your first workflow:</p>
			<Link href="/workflows/some-workflow-id">Your first workflow</Link>
			<form action="/auth/signout" method="post">
				<button type="submit">Log out</button>
			</form>
		</div>
	);
}
