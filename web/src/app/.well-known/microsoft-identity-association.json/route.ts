import { NextRequest, NextResponse } from "next/server";

// Needed for Microsoft Publisher Domain Verificatoin

// Note: to verify again, you need to make this route public (adapt the middleware)

export function GET(request: NextRequest) {
	const response = NextResponse.json(
		{
			associatedApplications: [
				{
					applicationId: "...",
				},
			],
		},
		{
			status: 200,
		},
	);

	return response;
}
