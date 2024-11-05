import z from "zod";

export const UserProfile = z.object({
	email: z.string(),
});
export type TUserProfile = z.infer<typeof UserProfile>;
