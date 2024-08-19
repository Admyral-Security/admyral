"use server";

import axios from "axios";
import { API_BASE_URL } from "@/constants/env";
import { HTTPMethod } from "@/types/api";

export async function apiCall<Request, Response>(
	method: HTTPMethod,
	path: string,
	requestData: Request,
): Promise<Response> {
	// TODO: we could add a flag if this is an authenticated call,
	// if yes, then we could fetch the API token here but first
	// we need to make sure that the user is signed in!

	// TODO(frontend): how does axios handle error response?
	const response = await axios({
		baseURL: API_BASE_URL,
		method,
		url: path,
		[method === HTTPMethod.GET ? "params" : "data"]: requestData,
		headers: {
			"Content-Type": "application/json",
			Accept: "application/json",
		},
	});

	return response.data;
}
