import { auth } from "@/auth";
import ApiKeys from "@/components/api-keys/api-keys";
import SignOutButton from "@/components/auth/signout-button";
import Secrets from "@/components/secrets/secrets";
import { DISABLE_AUTH } from "@/constants/env";
import { Box, Flex, Grid, Text } from "@radix-ui/themes";

export default async function SettingsPage() {
	const session = await auth();
	console.log("SETTINGS PAGE SESSION: ", session);
	try {
		const response = await fetch("http://localhost:3000/api/user", {
			method: "GET",
			cache: "no-store",
		}); // FIXME:
		console.log("SETTNINGS PAGE RESPONSE: ", response); // FIXME:
		const data = await response.text();
		console.log("SETTINGS PAGE: ", data); // FIXME:
	} catch (error) {
		console.log("SETTINGS PAGE ERROR: ", error);
		return <Text>Error</Text>;
	}

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
				{/* <Secrets /> */}
				{/* {!DISABLE_AUTH && <ApiKeys />} */}
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
