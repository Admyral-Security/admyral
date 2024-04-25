"use client";

import Link from "next/link";
import { resetPassowrd } from "./actions";
import LogoWithName from "@/components/icons/logo-with-name";

export default function ForgotPasswordPage() {
	return (
		<div className="flex min-h-full flex-1 flex-col justify-center px-6 py-12 lg:px-8 gap-4">
			<div className="flex items-center justify-center flex-row gap-4">
				<LogoWithName />
			</div>

			<div className="sm:mx-auto sm:w-full sm:max-w-sm">
				<form className="space-y-4" action={resetPassowrd}>
					<div>
						<label htmlFor="email">Email</label>
						<div className="mt-2">
							<input
								id="email"
								name="email"
								type="email"
								required
								className="block w-full rounded-md border-0 px-2 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-800 sm:text-sm sm:leading-6"
							/>
						</div>
					</div>

					<div>
						<button
							type="submit"
							className={`flex w-full justify-center rounded-md bg-blue-800 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-800`}
						>
							Reset password
						</button>
					</div>
				</form>
			</div>

			<div className="sm:mx-auto sm:w-full sm:max-w-sm hover:text-blue-800">
				<Link href="/login">Remember your password?</Link>
			</div>
		</div>
	);
}
