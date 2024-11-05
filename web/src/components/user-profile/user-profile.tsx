"use client";

import { Flex, Text, TextField } from "@radix-ui/themes";
import { useGetUserProfileApi } from "@/hooks/use-get-user-profile-api";
import ErrorCallout from "@/components/utils/error-callout";

export default function UserProfile() {
	const { data: userProfile, isPending, error } = useGetUserProfileApi();

	if (isPending) {
		return null;
	}

	if (error) {
		return <ErrorCallout />;
	}

	return (
		<Flex direction="column" width="296px">
			<label>
				<Text as="div" size="2" mb="1">
					Business E-Mail
				</Text>
				<TextField.Root value={userProfile.email} disabled />
			</label>
		</Flex>
	);
}
