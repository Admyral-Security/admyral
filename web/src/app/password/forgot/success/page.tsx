import LogoWithName from "@/components/icons/logo-with-name";
import Link from "next/link";

export default function SignUpSuccessPage() {
	return (
		<div className="flex min-h-full flex-1 flex-col justify-center px-6 py-12 lg:px-8 gap-4">
			<div className="flex items-center justify-center flex-row gap-4">
				<LogoWithName />
			</div>

			<div className="sm:mx-auto sm:w-full sm:max-w-sm">
				We sent you an email with a link for resetting your password.
			</div>

			<div className="sm:mx-auto sm:w-full sm:max-w-sm text-blue-800 hover:text-blue-700">
				<Link href="/login">Go to sign in</Link>
			</div>
		</div>
	);
}
