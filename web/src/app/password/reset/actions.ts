"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export async function updatePassword(formData: FormData) {
	if (formData.get("password") !== formData.get("password2")) {
		redirect(`/password/reset?error=Passwords do not match.`);
	}

	const supabase = createClient();
	const { error } = await supabase.auth.updateUser({
		password: formData.get("password") as string,
	});
	if (error) {
		redirect(`/password/reset?error=${error.message}`);
	}
	redirect("/");
}
