"use client";

import { useMutation } from "@tanstack/react-query";
import z from "zod";
import api from "@/lib/api";
import { HTTPMethod } from "@/types/api";

// DELETE /api/v1/user
const DeleteUserRequest = z.void();
const DeleteUserResponse = z.string().length(0);

const deleteUserApi = api<
	z.infer<typeof DeleteUserRequest>,
	z.infer<typeof DeleteUserResponse>
>({
	method: HTTPMethod.DELETE,
	path: "/api/v1/user",
	requestSchema: DeleteUserRequest,
	responseSchema: DeleteUserResponse,
});

export const useDeleteUserApi = () => {
	return useMutation({
		mutationFn: () => deleteUserApi(),
	});
};
