function fromHexToBytes(hex: string): Uint8Array {
	const buffer = [];
	if (hex.length % 2 !== 0) {
		throw new Error("Odd hex string length!");
	}
	for (let i = 0; i < hex.length; i += 2) {
		buffer.push(parseInt(hex[i] + hex[i + 1], 16));
	}
	return Uint8Array.from(buffer);
}

function toHex(bytes: Uint8Array): string {
	const buffer = [];
	for (let i = 0; i < bytes.length; ++i) {
		buffer.push(bytes[i].toString(16).padStart(2, "0"));
	}
	return buffer.join("");
}

let cachedCryptoKey: CryptoKey | null = null;

async function getCredentialsSecret(): Promise<CryptoKey> {
	if (cachedCryptoKey !== null) {
		return cachedCryptoKey;
	}

	const credentialsSecret = process.env.CREDENTIALS_SECRET;
	if (!credentialsSecret) {
		throw new Error("Missing environment variable: CREDENTIALS_SECRET");
	}
	const rawKey = fromHexToBytes(credentialsSecret);
	cachedCryptoKey = await crypto.subtle.importKey(
		"raw",
		rawKey,
		{
			name: "AES-GCM",
		},
		false,
		["encrypt", "decrypt"],
	);
	return cachedCryptoKey;
}

export async function encrypt(data: string): Promise<string> {
	const secret = await getCredentialsSecret();

	const encoded = new TextEncoder().encode(data);
	const iv = crypto.getRandomValues(new Uint8Array(12));
	// encrypted = ciphtertext|tag(16 Bytes)
	const encrypted = await crypto.subtle.encrypt(
		{ name: "AES-GCM", iv: iv },
		secret,
		encoded,
	);

	// nonce|ciphertext|tag
	const outputBuffer = new Uint8Array(encrypted.byteLength + iv.byteLength);
	outputBuffer.set(iv, 0);
	outputBuffer.set(new Uint8Array(encrypted), iv.length);

	return toHex(outputBuffer);
}
