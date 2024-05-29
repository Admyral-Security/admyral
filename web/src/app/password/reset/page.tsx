"use client";

import { updatePassword } from "./actions";
import { useEffect, useState } from "react";
import LogoWithName from "@/components/icons/logo-with-name";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Callout, Flex } from "@radix-ui/themes";
import { InfoCircledIcon } from "@radix-ui/react-icons";

export default function ResetPasswordPage() {
	const router = useRouter();
	const searchParams = useSearchParams();

	const [error, setError] = useState<string | null>(null);
	const [isUpdating, setIsUpdating] = useState<boolean>(false);
	const [isPasswordMismatch, setIsPasswordMismatch] =
		useState<boolean>(false);

	useEffect(() => {
		const errorMessage = searchParams.get("error");
		if (errorMessage !== null) {
			setError(errorMessage);

			// Remove the error parameter from the URL
			const params = new URLSearchParams(window.location.search);
			params.delete("error");
			router.replace(`?${params.toString()}`);
		}
	}, [searchParams, router]);

	const handleSubmit = async (event: any) => {
		event.preventDefault();

		setIsUpdating(true);
		setError(null);

		try {
			const formData = new FormData(event.currentTarget);
			if (formData.get("password") !== formData.get("password2")) {
				setError("Passwords do not match.");
				return;
			}
			await updatePassword(formData);
		} catch (error) {
			setError("Failed to update password.");
		} finally {
			setIsUpdating(false);
		}
	};

	return (
		<div className="flex min-h-full flex-1 flex-col justify-center px-6 py-12 lg:px-8 gap-4">
			<div className="flex items-center justify-center flex-row gap-4">
				<LogoWithName />
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

					<Flex width="100%">
						<Button
							style={{ width: "100%" }}
							type="submit"
							loading={isUpdating}
						>
							Update password
						</Button>
					</Flex>

					{error !== null && (
						<Callout.Root color="red">
							<Flex align="center" gap="5">
								<Callout.Icon>
									<InfoCircledIcon width="20" height="20" />
								</Callout.Icon>
								<Callout.Text size="2">{error}</Callout.Text>
							</Flex>
						</Callout.Root>
					)}
				</form>
			</div>
		</div>
	);
}
