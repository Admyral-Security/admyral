import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";

const CSRF_TOKEN_LENGTH = 32;

function generateState(length: number): string {
	return randomBytes(length).toString("hex");
}

export const GET = async (req: NextRequest) => {
	const token = generateState(CSRF_TOKEN_LENGTH);
	const response = NextResponse.json({ state: token }, { status: 200 });
	response.cookies.set("csrf-token", token);
	return response;
};
