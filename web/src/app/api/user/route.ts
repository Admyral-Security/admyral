import { NextRequest } from "next/server";
import { auth, signOut } from "@/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export const GET = auth(async (req) => {
	console.log("API CALL /api/user");
	// return NextResponse.json({ message: "Success" });

	console.log("API CALL /api/user AUTH: ", req.auth);
	console.log("API CALL /api/user REQUEST: ", req);

	// console.log("API USER - SESSION: ", session); // FIXME:

	// if (!session || !session.user || !session.user.id) {
	// 	console.log("API USER - SIGNING OUT");
	// 	// await signOut();
	// 	// return NextResponse.redirect("/login");
	// 	return NextResponse.json({ message: "Failed" });
	// }

	// const user = await prisma.user.findUnique({
	// 	where: {
	// 		id: session.user!.id,
	// 	},
	// });
	// console.log("API USER - USER: ", user); // FIXME:

	// FIXME:
	// return NextResponse.redirect("/");
	return NextResponse.json({ message: "Success" });
});
