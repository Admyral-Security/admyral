import { NextRequest, NextResponse } from "next/server";

// Needed for Microsoft Publisher Domain Verificatoin

export function GET(request: NextRequest) {
	const response = NextResponse.json(
		{
			associatedApplications: [
				{
					applicationId: "11fd63cf-12af-4751-8072-c4e3a92f3275",
				},
			],
		},
		{
			status: 200,
		},
	);

	return response;
}
