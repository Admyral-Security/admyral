"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

// function base64ToHex(s: string) {
// 	// Decode the Base64 string to a binary string.
// 	const binaryString = atob(s);
// 	// Convert each character to its hexadecimal code.
// 	const hexArray = Array.from(binaryString, (byte) => {
// 		// Convert each byte (character) to a two-digit hexadecimal number.
// 		return ("0" + byte.charCodeAt(0).toString(16)).slice(-2);
// 	});
// 	// Join all hexadecimal values into one string.
// 	return hexArray.join("");
// }

export default function Home() {
	// const key = await generateKey();
	// console.log(key); // FIXME:
	// const extractedKey = await exportKey(key);
	// console.log(extractedKey);
	// // console.log("Key:");
	// console.log(base64ToHex(extractedKey.k as string));

	// const text = "hello what's up?";
	// const cipher = await encrypt(text, key);
	// console.log("Cipher:");
	// console.log(cipher);

	const [execute, setExecute] = useState<boolean>(false);
	const [isExecuting, setIsExecuting] = useState<boolean>(false);

	useEffect(() => {
		if (!execute || isExecuting) {
			return;
		}

		setIsExecuting(true);

		// fetch("/api/credentials/create", {
		// 	method: "POST",
		// 	headers: {
		// 		"Content-Type": "application/json",
		// 	},
		// 	body: JSON.stringify({
		// 		credentialName: "my-api-key",
		// 		secret: "my-totally-secret-secret",
		// 	}),
		// })
		// 	// .then((res) => {
		// 	// 	console.log(res);
		// 	// })
		// 	.finally(() => {
		// 		setIsExecuting(false);
		// 		setExecute(false);
		// 	});

		// fetch("/api/credentials/list", {
		// 	method: "GET",
		// })
		// 	.then((res) => {
		// 		console.log("API Response:");
		// 		res.json().then((data) => {
		// 			console.log(data);
		// 		});
		// 	})
		// 	.finally(() => {
		// 		setIsExecuting(false);
		// 		setExecute(false);
		// 	});

		fetch("/api/credentials/delete", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				credentialName: "my-api-key",
			}),
		}).finally(() => {
			setIsExecuting(false);
			setExecute(false);
		});
	}, [execute]);

	return (
		<div>
			<p>Welcome back!</p>
			<p>Workflow Overview</p>
			<p>Check out your first workflow:</p>
			<Link href="/workflows/some-workflow-id">Your first workflow</Link>
			<form action="/auth/signout" method="post">
				<button type="submit">Log out</button>
			</form>
			<button type="button" onClick={() => setExecute(true)}>
				Store Credentials
			</button>
		</div>
	);
}
