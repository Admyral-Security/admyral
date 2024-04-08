import { encrypt } from "@/lib/crypto";
import prisma from "@/lib/db";
import { createClient } from "@/utils/supabase/server";
import { NextRequest } from "next/server";

// POST /api/credentials/create
export async function POST(request: NextRequest) {
	const supabase = createClient();

	const { credentialName, secret } = await request.json();

	const {
		data: { user },
	} = await supabase.auth.getUser();
	const userId = user?.id as string;

	// Check that the credential name does not yet exist
	const storedCredential = await prisma.credentials.findUnique({
		where: {
			user_id_credential_name: {
				user_id: userId,
				credential_name: credentialName,
			},
		},
	});

	if (storedCredential !== null) {
		return new Response("credential with the given name already exists", {
			status: 409, // Conflict
		});
	}

	const encryptedSecret = await encrypt(secret);

	await prisma.credentials.create({
		data: {
			user_id: userId,
			credential_name: credentialName,
			encrypted_secret: encryptedSecret,
		},
	});

	return new Response("success", {
		status: 201,
	});
}
