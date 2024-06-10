"use client";

import { loadUserProfile, updateUserProfile } from "@/lib/api";
import { UserProfile } from "@/lib/types";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import {
	Box,
	Button,
	Callout,
	Card,
	Flex,
	Text,
	TextField,
} from "@radix-ui/themes";
import Link from "next/link";
import { useEffect, useState } from "react";

/**
 * TODO:
 * - Update email address https://supabase.com/docs/reference/javascript/auth-updateuser
 */
export default function Account() {
	const [error, setError] = useState<string | null>(null);
	const [userProfile, setUserProfile] = useState<UserProfile>({
		firstName: "",
		lastName: "",
		company: "",
		email: "",
	});
	const [isSaving, setIsSaving] = useState<boolean>(false);

	useEffect(() => {
		loadUserProfile()
			.then((profile) => {
				setUserProfile(profile);
			})
			.catch((error) => {
				setError(
					`Failed to fetch user profile! If the problem persists, please contact us on Discord or via email ${process.env.NEXT_PUBLIC_SUPPORT_EMAIL}`,
				);
			});
	}, []);

	const handleSaveChanges = async () => {
		setIsSaving(true);
		setError(null);

		try {
			await updateUserProfile({
				firstName: userProfile.firstName,
				lastName: userProfile.lastName,
				company: userProfile.company,
			});
		} catch (error) {
			setError(
				`Failed to update user profile! If the problem persists, please contact us on Discord or via email ${process.env.NEXT_PUBLIC_SUPPORT_EMAIL}`,
			);
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<Box width="50%">
			<Card size="3" variant="classic">
				<Flex direction="column" gap="5">
					<Flex justify="start">
						<Text size="4" weight="medium">
							Account
						</Text>
					</Flex>

					{error && (
						<Callout.Root color="red">
							<Callout.Icon>
								<InfoCircledIcon />
							</Callout.Icon>
							<Callout.Text>{error}</Callout.Text>
						</Callout.Root>
					)}

					<Flex direction="column" gap="4">
						<Flex
							direction="column"
							gap="2"
							width="50%"
							maxWidth="380px"
						>
							<Text>First Name</Text>
							<TextField.Root
								variant="surface"
								value={userProfile.firstName}
								onChange={(event) =>
									setUserProfile({
										...userProfile,
										firstName: event.target.value,
									})
								}
							/>
						</Flex>

						<Flex
							direction="column"
							gap="2"
							width="50%"
							maxWidth="380px"
						>
							<Text>Last Name</Text>
							<TextField.Root
								variant="surface"
								value={userProfile.lastName}
								onChange={(event) =>
									setUserProfile({
										...userProfile,
										lastName: event.target.value,
									})
								}
							/>
						</Flex>

						<Flex
							direction="column"
							gap="2"
							width="50%"
							maxWidth="380px"
						>
							<Text>Company</Text>
							<TextField.Root
								variant="surface"
								value={userProfile.company}
								onChange={(event) =>
									setUserProfile({
										...userProfile,
										company: event.target.value,
									})
								}
							/>
						</Flex>

						<Flex
							direction="column"
							gap="2"
							width="50%"
							maxWidth="380px"
						>
							<Text>Email</Text>
							<TextField.Root
								disabled
								variant="surface"
								value={userProfile.email}
								onChange={(event) =>
									setUserProfile({
										...userProfile,
										email: event.target.value,
									})
								}
							/>
						</Flex>
					</Flex>

					<Box maxWidth="200px">
						<Button
							size="2"
							variant="solid"
							style={{ cursor: "pointer" }}
							onClick={handleSaveChanges}
							loading={isSaving}
						>
							Save changes
						</Button>
					</Box>

					<Box maxWidth="200px">
						<Link href="/password/reset">
							<Button
								size="2"
								variant="outline"
								style={{ cursor: "pointer" }}
							>
								Change password
							</Button>
						</Link>
					</Box>
				</Flex>
			</Card>
		</Box>
	);
}
