export async function generateKey(): Promise<CryptoKey> {
	return await crypto.subtle.generateKey(
		{
			name: "AES-GCM",
			length: 256,
		},
		true,
		["encrypt", "decrypt"],
	);
}

export async function exportKey(key: CryptoKey): Promise<JsonWebKey> {
	return await crypto.subtle.exportKey("jwk", key);
}

export async function importKey(jwk: JsonWebKey) {
	return await crypto.subtle.importKey(
		"jwk",
		jwk,
		{
			name: "AES-GCM",
		},
		false,
		["encrypt", "decrypt"],
	);
}

function toHex(bytes: Uint8Array): String {
	const buffer = [];
	for (let i = 0; i < bytes.length; ++i) {
		buffer.push(bytes[i].toString(16).padStart(2, "0"));
	}
	return buffer.join("");
}

export async function encrypt(data: string, key: CryptoKey): Promise<String> {
	const encoded = new TextEncoder().encode(data);
	const iv = crypto.getRandomValues(new Uint8Array(12));
	// encrypted = ciphtertext|tag(16 Bytes)
	const encrypted = await crypto.subtle.encrypt(
		{ name: "AES-GCM", iv: iv },
		key,
		encoded,
	);
	const outputBuffer = new Uint8Array(encrypted.byteLength + iv.byteLength);
	outputBuffer.set(iv, 0);
	outputBuffer.set(new Uint8Array(encrypted), iv.length);

	console.log(outputBuffer); // FIXME:

	// return (encrypted = { encrypted: encrypted, iv: iv });
	return toHex(outputBuffer);
}

/*
async function decrypt(encrypted, iv, key) {
	let decrypted = await crypto.subtle.decrypt(
		{ name: "AES-GCM", iv: iv },
		key,
		encrypted,
	);
	let decoded = new TextDecoder().decode(decrypted);
	return decoded;
}
*/
