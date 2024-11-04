import { Box } from "@radix-ui/themes";
import SideNavItem from "./side-nav-item";

export const SideNavSettings = () => (
	<Box mt="4" width="165px">
		<SideNavItem
			href="/settings"
			title="Account"
			selectionCriteria={["/settings"]}
			basePath="/settings"
		/>
		<SideNavItem
			href="/settings/secrets"
			title="Secrets"
			selectionCriteria={["/settings/secrets"]}
			basePath="/settings"
		/>
		<SideNavItem
			href="/settings/api-keys"
			title="API Keys"
			selectionCriteria={["/settings/api-keys"]}
			basePath="/settings"
		/>
	</Box>
);
