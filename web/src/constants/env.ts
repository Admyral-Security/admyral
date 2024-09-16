export const API_BASE_URL =
	process.env.ADMYRAL_API_BASE_URL || "http://127.0.0.1:8000";

export const DISABLE_AUTH =
	(process.env.ADMYRAL_DISABLE_AUTH || "false") === "true";

export const AUTH_SECRET =
	process.env.AUTH_SECRET || "QzkuVCn7OGfkpoX98aOxf2tc3kFX8pZs71N1wHPo8NM=";

export const GITHUB_CLIENT_ID = process.env.AUTH_GITHUB_ID;
export const GITHUB_SECRET = process.env.AUTH_GITHUB_SECRET;
