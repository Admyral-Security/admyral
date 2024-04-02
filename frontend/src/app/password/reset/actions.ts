"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export async function updatePassword(formData: FormData) {
	const supabase = createClient();

	// TODO: handle HTTP status "422: New password should be different from the old password."
	const { error } = await supabase.auth.updateUser({
		password: formData.get("password") as string,
	});
	if (error) {
		redirect("/error");
	}
	redirect("/");
}
