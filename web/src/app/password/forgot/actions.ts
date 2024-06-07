"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function resetPassowrd(email: string) {
	const supabase = createClient();
	const { error } = await supabase.auth.resetPasswordForEmail(email);
	if (error) {
		redirect(`/password/forgot?error=${error.message}`);
	}
	revalidatePath("/", "layout");
	redirect("/password/forgot/success");
}
