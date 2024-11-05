import SignOutButton from "@/components/auth/sign-out-button";
import DeleteAccountButton from "@/components/delete-account-button/delete-account-button";
import { Box, Flex, Text } from "@radix-ui/themes";
import { DISABLE_AUTH } from "@/constants/env";
import UserProfile from "@/components/user-profile/user-profile";

export default function AccountPage() {
	return (
		<Flex direction="column" justify="start" gap="4" p="5" width="90%">
			<Flex>
				<Text size="4" weight="medium">
					Account
				</Text>
			</Flex>

			<UserProfile />

			{!DISABLE_AUTH && (
				<Box width="151px">
					<SignOutButton />
				</Box>
			)}

			{!DISABLE_AUTH && (
				<Box width="151px">
					<DeleteAccountButton />
				</Box>
			)}
		</Flex>
	);
}
