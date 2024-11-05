import { Box } from "@radix-ui/themes";
import SideNavItem from "./side-nav-item";

const NAV_ITEMS = [
	{
		href: "/settings",
		title: "Account",
		selectionCriteria: ["/settings"],
	},
	{
		href: "/settings/secrets",
		title: "Secrets",
		selectionCriteria: ["/settings/secrets"],
	},
	{
		href: "/settings/api-keys",
		title: "API Keys",
		selectionCriteria: ["/settings/api-keys"],
	},
];

export default function SideNavSettings() {
	return (
		<Box mt="4" width="165px">
			{NAV_ITEMS.map((item, idx) => (
				<SideNavItem
					key={`side_nav_settings_${idx}`}
					href={item.href}
					title={item.title}
					selectionCriteria={item.selectionCriteria}
					basePath="/settings"
				/>
			))}
		</Box>
	);
}
