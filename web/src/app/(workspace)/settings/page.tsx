import Account from "@/components/account";
import Credentials from "@/components/credentials";
import DeleteAccountButton from "@/components/delete-account-button";
import LogoutButton from "@/components/logout-button";
import { Flex, Grid, Text } from "@radix-ui/themes";

export default function SettingsPage() {
	return (
		<Grid rows="48px 1fr" width="auto">
			<Flex
				pb="2"
				pt="2"
				pl="4"
				pr="4"
				justify="between"
				align="center"
				className="border-b-2 border-gray-200"
			>
				<Text size="4" weight="medium">
					Settings
				</Text>
			</Flex>

			<Flex
				mt="6"
				direction="column"
				height="100%"
				width="100%"
				justify="center"
				align="center"
				gap="5"
			>
				<Account />
				<Credentials />
				<Flex width="50%" justify="start" gap="5">
					<LogoutButton />
					<DeleteAccountButton />
				</Flex>
			</Flex>
		</Grid>
	);
}
