"use client";

import Logo from "@/components/icons/logo";
import { updatePassword } from "./actions";
import { useState } from "react";

export default function ResetPasswordPage() {
	const [isUpdating, setIsUpdating] = useState<boolean>(false);
	const [isPasswordMismatch, setIsPasswordMismatch] =
		useState<boolean>(false);

	const handleSubmit = async (event: any) => {
		event.preventDefault();

		setIsUpdating(true);

		const formData = new FormData(event.currentTarget);
		if (formData.get("password") !== formData.get("password2")) {
			setIsPasswordMismatch(true);
			setIsUpdating(false);
			return;
		}

		await updatePassword(formData);
	};

	return (
		<div className="flex min-h-full flex-1 flex-col justify-center px-6 py-12 lg:px-8 gap-4">
			<div className="flex items-center justify-center flex-row gap-4">
				<Logo /> <p className="text-4xl">Admyral</p>
			</div>

			<div className="flex items-center justify-center flex-row gap-4">
				Update your password.
			</div>

			<div className="sm:mx-auto sm:w-full sm:max-w-sm">
				<form className="space-y-4" onSubmit={handleSubmit}>
					<div>
						<label htmlFor="password">New password</label>
						<div className="mt-2">
							<input
								id="password"
								name="password"
								type="password"
								required
								className="block w-full rounded-md border-0 px-2 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-800 sm:text-sm sm:leading-6"
							/>
						</div>
					</div>

					<div>
						<label htmlFor="password">Repeat new password</label>
						<div className="mt-2">
							<input
								id="password2"
								name="password2"
								type="password"
								required
								className="block w-full rounded-md border-0 px-2 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-800 sm:text-sm sm:leading-6"
							/>
						</div>
					</div>

					<div>
						<button
							type="submit"
							className={`flex w-full items-center justify-center rounded-md bg-blue-800 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm ${isUpdating ? "" : "hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-800"}`}
							disabled={isUpdating}
						>
							{isUpdating ? (
								<div className="flex flex-row items-center space-x-2">
									<span
										className="animate-spin inline-block w-4 h-4 border-[3px] border-current border-t-transparent text-white rounded-full"
										role="status"
										aria-label="loading"
									></span>
									<span>Updating password...</span>
								</div>
							) : (
								"Update password"
							)}
						</button>
					</div>

					{isPasswordMismatch && (
						<div className="text-red-500">
							Passswords do not match.
						</div>
					)}
				</form>
			</div>
		</div>
	);
}
