import AddSecret from "@/components/secrets/add-secret";
import Secrets from "@/components/secrets/secrets";
import { ReaderIcon } from "@radix-ui/react-icons";
import { Button, Flex, Text } from "@radix-ui/themes";
import Link from "next/link";

export default function SecretsPage() {
	return (
		<Flex direction="column" justify="start" gap="4" p="5" width="90%">
			<Flex
				direction="column"
				align="start"
				justify="start"
				gap="2"
				width="100%"
			>
				<Flex align="start" justify="between" width="100%">
					<Text size="4" weight="medium">
						Secrets
					</Text>

					<AddSecret />
				</Flex>

				<Link
					href="https://docs.admyral.dev/integrations/integrations"
					target="_blank"
					rel="noopener noreferrer"
				>
					<Button variant="ghost" style={{ cursor: "pointer" }}>
						<ReaderIcon />
						Documentation
					</Button>
				</Link>
			</Flex>

			<Secrets />
		</Flex>
	);
}
