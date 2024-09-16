"use server";

import os from "os";
import path from "path";

/**
 * Mimics get_global_project_directory from admyral/config/config.py
 *
 * @returns
 */
export function getGlobalProjectDirectory() {
	if (process.env.ADMYRAL_APP_DIR) {
		return process.env.ADMYRAL_APP_DIR;
	}

	const appName = "Admyral";
	switch (process.platform) {
		case "win32":
			return path.join(process.env.APPDATA || "", appName);
		case "darwin":
			return path.join(
				os.homedir(),
				"Library",
				"Application Support",
				appName,
			);
		default: // Linux and other Unix-like systems
			return path.join(os.homedir(), ".config", appName);
	}
}
