import prisma from "@/lib/db";
import { createClient } from "@/utils/supabase/server";

// GET /api/credentials/list
export async function GET() {
	const supabase = createClient();

	const {
		data: { user },
	} = await supabase.auth.getUser();
	const userId = user?.id as string;

	const credentials = await prisma.credentials.findMany({
		where: {
			user_id: userId,
		},
		select: {
			credential_name: true,
		},
	});

	const credentialNames = credentials.map(
		(credential) => credential.credential_name,
	);

	return Response.json(credentialNames, {
		status: 200,
	});
}
