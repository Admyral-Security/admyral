import { type NextRequest, NextResponse } from "next/server";

const data = {
	associatedApplications: [
		{
			applicationId: "4a433445-8c39-48e1-8732-dee28c5ac131",
		},
	],
};

export async function GET(request: NextRequest) {
	return NextResponse.json(data);
}
