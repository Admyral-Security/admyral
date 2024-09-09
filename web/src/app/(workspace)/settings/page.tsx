import SignOutButton from "@/components/auth/signout-button";
import Secrets from "@/components/secrets/secrets";
import { Box, Flex, Grid, Text } from "@radix-ui/themes";

export default async function SettingsPage() {
	return (
		<Grid rows="50px 1fr" width="auto" height="100%">
			<Box width="100%" height="100%">
				<Flex
					pb="2"
					pt="2"
					pl="4"
					pr="4"
					justify="between"
					align="center"
					className="border-b-2 border-gray-200"
					height="56px"
					width="calc(100% - 56px)"
					style={{
						position: "fixed",
						zIndex: 100,
						backgroundColor: "white",
					}}
				>
					<Text size="4" weight="medium">
						Settings
					</Text>
				</Flex>
			</Box>

			<Flex
				mt="6"
				direction="column"
				height="100%"
				width="100%"
				justify="start"
				align="center"
				gap="5"
			>
				<Secrets />
				{/* <Account />
				<Credentials />
				<Usage />
				<Flex width="50%" justify="start" gap="5">
					<LogoutButton />
					<DeleteAccountButton />
				</Flex> */}
				<Flex width="50%" justify="start" gap="5">
					<SignOutButton />
					{/* <DeleteAccountButton /> */}
				</Flex>
			</Flex>
		</Grid>
	);
}
