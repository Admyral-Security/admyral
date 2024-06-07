"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";
import useGettingStartedDialog from "./getting-started-provider";
import { updateUserProfile } from "@/lib/api";
import WelcomeDialogModal from "@/components/welcome-dialog-modal";

const ROLES = [
	"General Management",
	"SOC / Security Manager",
	"Security Analyst",
	"Security Engineer",
	"Security Architect",
	"IT Manager / Sys Admin",
	"Freelancer",
	"Student",
	"Other",
];

const CHECKBOXES = [
	"Within the next 6 months, my company is looking for an automation solution",
	"My company might be interested in an automation solution in the future",
	"I am just exploring",
];

type WelcomeDialogContextType = {
	openWelcomeDialog: () => void;
};

const WelcomeDialogContext = createContext<WelcomeDialogContextType>({
	openWelcomeDialog: () => {},
});

interface WelcomeDialogProviderProps {
	children: React.ReactNode;
}

export function WelcomeDialogProvider({
	children,
}: WelcomeDialogProviderProps) {
	const [open, setOpen] = useState<boolean>(false);
	const [isSaving, setIsSaving] = useState<boolean>(false);
	const [userInformation, setUserInformation] = useState<any>({
		name: undefined,
		company: undefined,
		role: undefined,
		pick: [],
	});

	const searchParams = useSearchParams();
	const router = useRouter();

	const { openGettingStartedDialog } = useGettingStartedDialog();

	useEffect(() => {
		if (open) {
			const isFirstLogin = searchParams.get("isFirstLogin");
			if (isFirstLogin !== null) {
				const params = new URLSearchParams(window.location.search);
				params.delete("isFirstLogin");
				router.replace(`?${params.toString()}`);
			}
		}
	}, [open, searchParams, router]);

	const nextDisabled =
		userInformation.role === undefined ||
		userInformation.role === "" ||
		userInformation.pick.length === 0;

	const handleSave = async () => {
		try {
			setIsSaving(true);

			let firstName = "";
			let lastName = "";

			const nameSplit =
				userInformation.name !== undefined
					? userInformation.name.split(" ")
					: [];
			if (nameSplit.length == 1) {
				firstName = nameSplit[0];
			} else if (nameSplit.length > 1) {
				firstName = nameSplit[0];
				lastName = nameSplit.slice(1).join(" ");
			}

			await updateUserProfile({
				firstName,
				lastName,
				company: userInformation.company,
				role: userInformation.role,
				additionalInfo: userInformation.pick,
			});
		} finally {
			setOpen(false);
			setIsSaving(false);
			openGettingStartedDialog();
		}
	};

	return (
		<>
			<WelcomeDialogContext.Provider
				value={{ openWelcomeDialog: () => setOpen(true) }}
			>
				{children}
			</WelcomeDialogContext.Provider>

			<WelcomeDialogModal
				open={open}
				userInformation={userInformation}
				setUserInformation={setUserInformation}
				roles={ROLES}
				checkboxes={CHECKBOXES}
				handleSave={handleSave}
				isSaving={isSaving}
				nextDisabled={nextDisabled}
			/>
		</>
	);
}

export default function useWelcomeDialog() {
	const context = useContext(WelcomeDialogContext);
	if (context === undefined) {
		throw new Error(
			"useWelcomeDialog must be used within a WelcomeDialogProvider",
		);
	}
	return context;
}
