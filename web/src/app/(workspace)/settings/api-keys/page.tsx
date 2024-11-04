import ApiKeys from "@/components/api-keys/api-keys";
import CreateApiKey from "@/components/api-keys/create-api-keys";
import { DISABLE_AUTH } from "@/constants/env";
import { Flex, Text } from "@radix-ui/themes";

export default function ApiKeysPage() {
	return (
		<Flex direction="column" justify="start" gap="4" p="5" width="90%">
			<Flex align="start" justify="between" width="100%">
				<Text size="4" weight="medium">
					API Keys
				</Text>

				{!DISABLE_AUTH && <CreateApiKey />}
			</Flex>

			{!DISABLE_AUTH && <ApiKeys />}
			{DISABLE_AUTH && (
				<Text>API Keys are not available for local hosting.</Text>
			)}
		</Flex>
	);
}
