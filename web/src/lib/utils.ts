export function snakeCaseToCapitalizedCase(snakeCase: string): string {
	return snakeCase
		.split("_")
		.map((s) => s.charAt(0).toUpperCase() + s.slice(1))
		.join(" ");
}

export function hasEmptyKey(secret: { key: string; value: string }[]): boolean {
	return secret.some((kv) => kv.key.length === 0);
}
