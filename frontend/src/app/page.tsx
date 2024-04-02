export default async function Home() {
	return (
		<div>
			<p>Welcome back!</p>
			<form action="/auth/signout" method="post">
				<button type="submit">Log out</button>
			</form>
		</div>
	);
}
