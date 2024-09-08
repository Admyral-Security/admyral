import { hash, compare } from "bcryptjs";

// TODO: https://github.com/langfuse/langfuse/blob/main/web/src/features/auth-credentials/lib/credentialsServerUtils.ts

export async function createUserEmailPassword(
	email: string,
	password: string,
	name: string,
): Promise<string> {
	// TODO:
	return "";
}

export async function updateUserPassword(userId: string, password: string) {
	// TODO:
}

export async function hashPassword(password: string) {
	return await hash(password, 12);
}

export async function verifyPassword(password: string, hashedPassword: string) {
	return await compare(password, hashedPassword);
}

function containsNonAlphaNumericChar(s: string): boolean {
	return s.match(/\W/g) !== null;
}

function containsAlphaNumericChar(s: string): boolean {
	return s.match(/[a-zA-Z0-9]/g) !== null;
}

export function isValidPassword(password: string) {
	return (
		password.length >= 8 &&
		containsAlphaNumericChar(password) &&
		containsNonAlphaNumericChar(password)
	);
}
