"use client";

import { ActionType } from "@prisma/client";
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

		console.log("EXECUTE!!!"); // FIXME:

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

		// fetch("/api/credentials/delete", {
		// 	method: "POST",
		// 	headers: {
		// 		"Content-Type": "application/json",
		// 	},
		// 	body: JSON.stringify({
		// 		credentialName: "my-api-key",
		// 	}),
		// }).finally(() => {
		// 	setIsExecuting(false);
		// 	setExecute(false);
		// });

		// Create new workflow
		// fetch("/api/workflows/create", {
		// 	method: "POST",
		// 	headers: {
		// 		"Content-Type": "application/json",
		// 	},
		// })
		// 	.then((res) => {
		// 		res.json().then((data) => {
		// 			console.log(data);
		// 		});
		// 	})
		// 	.finally(() => {
		// 		setIsExecuting(false);
		// 		setExecute(false);
		// 	});

		const workflowId = "18ecc062-56d5-4df2-a983-8281fdecc6a4";

		// // Update workflow
		// fetch("/api/workflows/fbedae73-dfc2-4401-8221-9e624ea91cf0/update", {
		// 	method: "POST",
		// 	headers: {
		// 		"Content-Type": "application/json",
		// 	},
		// 	body: JSON.stringify({
		// 		workflowName: "another one",
		// 		workflowDescription: "blablabla",
		// 		isLive: true,
		// 	}),
		// })
		// 	.then((res) => {
		// 		console.log(res.status);
		// 	})
		// 	.finally(() => {
		// 		setIsExecuting(false);
		// 		setExecute(false);
		// 	});

		// // List workflows
		// fetch("/api/workflows", {
		// 	method: "GET",
		// })
		// 	.then((res) => {
		// 		console.log(res.status);
		// 		res.json().then((data) => {
		// 			console.log(`Data: ${JSON.stringify(data)}`);
		// 		});
		// 	})
		// 	.finally(() => {
		// 		setIsExecuting(false);
		// 		setExecute(false);
		// 	});

		// // Create an action
		// fetch(`api/workflows/${workflowId}/actions/create`, {
		// 	method: "POST",
		// 	headers: {
		// 		"Content-Type": "application/json",
		// 	},
		// 	body: JSON.stringify({
		// 		actionName: "some http request",
		// 		actionDescription: "an HTTP request",
		// 		actionType: ActionType.HttpRequest,
		// 	}),
		// })
		// 	.then((res) => {
		// 		console.log(res.status);
		// 		res.json().then((data) => {
		// 			console.log(`Data: ${JSON.stringify(data)}`);
		// 		});
		// 	})
		// 	.finally(() => {
		// 		setIsExecuting(false);
		// 		setExecute(false);
		// 	});

		// fetch(`api/workflows/${workflowId}/actions/create`, {
		// 	method: "POST",
		// 	headers: {
		// 		"Content-Type": "application/json",
		// 	},
		// 	body: JSON.stringify({
		// 		actionName: "my cool webhook",
		// 		actionDescription: "just a webhook",
		// 		actionType: ActionType.Webhook,
		// 	}),
		// })
		// 	.then((res) => {
		// 		console.log(res.status);
		// 		res.json().then((data) => {
		// 			console.log(`Data: ${JSON.stringify(data)}`);
		// 		});
		// 	})
		// 	.finally(() => {
		// 		setIsExecuting(false);
		// 		setExecute(false);
		// 	});

		const webhookActionId = "c91305d7-7c06-42e6-bc09-ce359c26cd9e";
		const httpRequestActionId = "5502e845-9fba-45c4-a1c3-0f81b4d16639";

		// // Update an action
		// fetch(
		// 	`api/workflows/${workflowId}/actions/${httpRequestActionId}/update`,
		// 	{
		// 		method: "POST",
		// 		headers: {
		// 			"Content-Type": "application/json",
		// 		},
		// 		body: JSON.stringify({
		// 			actionName: "pretty cool API call",
		// 			actionDescription: "an http request",
		// 			actionDefinition: {
		// 				url: "https://1ec498973e1abe4622fd3dc2a9ecd62d.m.pipedream.net",
		// 				method: "Get",
		// 				headers: { "Content-Type": "application/json" },
		// 				payload: { message: "Hello from my automation" },
		// 			},
		// 		}),
		// 	},
		// )
		// 	.then((res) => {
		// 		console.log(res.status);
		// 	})
		// 	.finally(() => {
		// 		setIsExecuting(false);
		// 		setExecute(false);
		// 	});

		// // Connect the two actions
		// fetch(`/api/workflows/${workflowId}/edge/add`, {
		// 	method: "POST",
		// 	headers: {
		// 		"Content-Type": "application/json",
		// 	},
		// 	body: JSON.stringify({
		// 		parentActionId: webhookActionId,
		// 		childActionId: httpRequestActionId,
		// 	}),
		// })
		// 	.then((res) => {
		// 		console.log(res.status);
		// 	})
		// 	.finally(() => {
		// 		setIsExecuting(false);
		// 		setExecute(false);
		// 	});

		// // Delete an edge
		// fetch(`/api/workflows/${workflowId}/edge/delete`, {
		// 	method: "POST",
		// 	headers: {
		// 		"Content-Type": "application/json",
		// 	},
		// 	body: JSON.stringify({
		// 		parentActionId: webhookActionId,
		// 		childActionId: httpRequestActionId,
		// 	}),
		// })
		// 	.then((res) => {
		// 		console.log(res.status);
		// 	})
		// 	.finally(() => {
		// 		setIsExecuting(false);
		// 		setExecute(false);
		// 	});

		// Fetch a workflow
		fetch(`/api/workflows/${workflowId}`, {
			method: "GET",
		})
			.then((res) => {
				res.json().then((data) => {
					console.log(data);
				});
			})
			.finally(() => {
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
