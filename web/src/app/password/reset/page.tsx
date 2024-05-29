"use client";

import { updatePassword } from "./actions";
import { useState } from "react";
import LogoWithName from "@/components/icons/logo-with-name";
import { Button, Callout, Flex } from "@radix-ui/themes";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import useSearchParameterError, {
	SearchParameterErrorProvider,
} from "@/providers/search-paramater-error-provider";

function ResetPasswordPageChild() {
	const [isUpdating, setIsUpdating] = useState<boolean>(false);

	const { error, resetError } = useSearchParameterError();

	const handleSubmit = async (event: any) => {
		event.preventDefault();

		setIsUpdating(true);
		resetError();

		try {
			await updatePassword(new FormData(event.currentTarget));
		} catch (error) {
			console.log("Error during password reset: ", error);
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

export default function ResetPasswordPage() {
	return (
		<SearchParameterErrorProvider>
			<ResetPasswordPageChild />
		</SearchParameterErrorProvider>
	);
}
