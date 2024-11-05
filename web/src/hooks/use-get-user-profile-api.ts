"use client";

import { useQuery } from "@tanstack/react-query";
import z from "zod";
import api from "@/lib/api";
import { HTTPMethod } from "@/types/api";
import { UserProfile } from "@/types/user-profile";

// GET /api/v1/users
const GetUserProfileRequest = z.void();

const getUserProfile = api<
	z.input<typeof GetUserProfileRequest>,
	z.infer<typeof UserProfile>
>({
	method: HTTPMethod.GET,
	path: "/api/v1/user",
	requestSchema: GetUserProfileRequest,
	responseSchema: UserProfile,
});

export const useGetUserProfileApi = () => {
	return useQuery({
		queryKey: ["get-user-profile"],
		queryFn: () => getUserProfile(),
	});
};
