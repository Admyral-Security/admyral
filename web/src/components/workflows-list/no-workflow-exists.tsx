import { Callout, Card } from "@radix-ui/themes";
import { InfoCircledIcon } from "@radix-ui/react-icons";

export default function NoWorkflowExists() {
	return (
		<Card size="3">
			<Callout.Root variant="surface" size="3" highContrast>
				<Callout.Icon>
					<InfoCircledIcon />
				</Callout.Icon>
				<Callout.Text size="3">
					No workflow has been created yet.
				</Callout.Text>
			</Callout.Root>
		</Card>
	);
}
