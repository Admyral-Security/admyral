"use client";

import Link from "next/link";
import { resetPassowrd } from "./actions";
import LogoWithName from "@/components/icons/logo-with-name";
import { Suspense, useState } from "react";
import { Button, Callout, Flex } from "@radix-ui/themes";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import useSearchParameterError, {
	SearchParameterErrorProvider,
} from "@/providers/search-paramater-error-provider";

function ForgotPasswordPageChild() {
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const { error, resetError } = useSearchParameterError();

	const handleSubmit = async (event: any) => {
		event.preventDefault();

		setIsLoading(true);
		resetError();

		try {
			await resetPassowrd(new FormData(event.currentTarget));
		} catch (error) {
			console.error("Error during password reset: ", error);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="flex min-h-full flex-1 flex-col justify-center px-6 py-12 lg:px-8 gap-4">
			<div className="flex items-center justify-center flex-row gap-4">
				<LogoWithName />
			</div>

			<div className="sm:mx-auto sm:w-full sm:max-w-sm">
				<form className="space-y-4" action={handleSubmit}>
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

					<Flex width="100%">
						<Button
							style={{ width: "100%", cursor: "pointer" }}
							type="submit"
							loading={isLoading}
						>
							Reset password
						</Button>
					</Flex>
				</form>
			</div>

			<div className="sm:mx-auto sm:w-full sm:max-w-sm hover:text-blue-800">
				<Link href="/login">Remember your password?</Link>
			</div>
		</div>
	);
}

export default function ForgotPasswordPage() {
	return (
		<Suspense fallback={null}>
			<SearchParameterErrorProvider>
				<ForgotPasswordPageChild />
			</SearchParameterErrorProvider>
		</Suspense>
	);
}
