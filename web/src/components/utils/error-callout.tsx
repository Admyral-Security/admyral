import { InfoCircledIcon } from "@radix-ui/react-icons";
import { Callout, Flex } from "@radix-ui/themes";

export default function ErrorCallout() {
	return (
		<Callout.Root color="red">
			<Flex align="center" gap="5">
				<Callout.Icon>
					<InfoCircledIcon width="20" height="20" />
				</Callout.Icon>
				<Callout.Text size="2">
					Oops, something went wrong. If the problem persists, please
					contact us on Discord or via email chris@adymral.dev
				</Callout.Text>
			</Flex>
		</Callout.Root>
	);
}
