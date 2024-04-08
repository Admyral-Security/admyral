import prisma from "@/lib/db";
import { createClient } from "@/utils/supabase/server";
import { NextRequest } from "next/server";

// POST /api/credentials/delete
export async function POST(request: NextRequest) {
	const supabase = createClient();

	const { credentialName } = await request.json();

	const {
		data: { user },
	} = await supabase.auth.getUser();
	const userId = user?.id as string;

	await prisma.credentials.delete({
		where: {
			user_id_credential_name: {
				user_id: userId,
				credential_name: credentialName,
			},
		},
	});

	return new Response("success", {
		status: 201,
	});
}
