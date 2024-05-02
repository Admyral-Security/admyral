import { NextRequest, NextResponse } from "next/server";

export function GET(request: NextRequest) {
	const response = NextResponse.json(
		{
			associatedApplications: [
				{
					applicationId: "4a433445-8c39-48e1-8732-dee28c5ac131",
				},
			],
		},
		{
			status: 200,
		},
	);

	return response;
}
