// import { encrypt, exportKey, generateKey } from "@/utils/crypto";

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

export default async function Home() {
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

	return (
		<div>
			<p>Welcome back!</p>
			<form action="/auth/signout" method="post">
				<button type="submit">Log out</button>
			</form>
		</div>
	);
}
