"use client";

import Logo from "@/components/icons/logo";
import { login, signup } from "./actions";
import { useState } from "react";
import Link from "next/link";

export default function LoginPage() {
	const [isSignIn, setIsSignIn] = useState<boolean>(true);
	const [isLoading, setIsLoading] = useState<boolean>(false);

	const handleSubmit = async (event: any) => {
		event.preventDefault();

		setIsLoading(true);

		const formData = new FormData(event.currentTarget);
		if (isSignIn) {
			await login(formData);
		} else {
			await signup(formData);
		}
	};

	return (
		<div className="flex min-h-full flex-1 flex-col justify-center px-6 py-12 lg:px-8 gap-4">
			<div className="flex items-center justify-center flex-row gap-4">
				<Logo /> <p className="text-4xl">Admyral</p>
			</div>

			<div className="sm:mx-auto sm:w-full sm:max-w-sm">
				<ul className="flex flex-wrap -mb-px text-sm font-medium text-center text-gray-500 dark:text-gray-400">
					<li className="me-2">
						<button
							type="button"
							onClick={() => setIsSignIn(true)}
							disabled={isSignIn || isLoading}
							className={
								isSignIn
									? "inline-flex items-center justify-center p-4 text-blue-800 border-b-2 border-blue-800 rounded-t-lg active dark:text-blue-800 dark:border-blue-800 group"
									: "inline-flex items-center justify-center p-4 border-b-2 border-transparent rounded-t-lg hover:text-gray-600 hover:border-gray-300 dark:hover:text-gray-300 group"
							}
							aria-current={isSignIn ? "page" : undefined}
						>
							Sign in
						</button>
					</li>
					<li className="me-2">
						<button
							type="button"
							onClick={() => setIsSignIn(false)}
							disabled={!isSignIn || isLoading}
							className={
								!isSignIn
									? "inline-flex items-center justify-center p-4 text-blue-800 border-b-2 border-blue-500 rounded-t-lg active dark:text-blue-800 dark:border-blue-800 group"
									: "inline-flex items-center justify-center p-4 border-b-2 border-transparent rounded-t-lg hover:text-gray-600 hover:border-gray-300 dark:hover:text-gray-300 group"
							}
							aria-current={!isSignIn ? "page" : undefined}
						>
							Register
						</button>
					</li>
				</ul>
			</div>

			<div className="sm:mx-auto sm:w-full sm:max-w-sm">
				<form className="space-y-4" onSubmit={handleSubmit}>
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
						<label htmlFor="password">Password</label>
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
						<button
							type="submit"
							className={`flex w-full items-center justify-center rounded-md bg-blue-800 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm ${isLoading ? "" : "hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-800"}`}
							disabled={isLoading}
						>
							{isLoading ? (
								<div className="flex flex-row items-center space-x-2">
									<span
										className="animate-spin inline-block w-4 h-4 border-[3px] border-current border-t-transparent text-white rounded-full"
										role="status"
										aria-label="loading"
									></span>
									<span>
										{isSignIn
											? "Signing in..."
											: "Registering..."}
									</span>
								</div>
							) : isSignIn ? (
								"Sign in"
							) : (
								"Register"
							)}
						</button>
					</div>
				</form>
			</div>

			<div className="sm:mx-auto sm:w-full sm:max-w-sm hover:text-blue-800">
				<Link href="/password/forgot">Forgot password?</Link>
			</div>
		</div>
	);
}
