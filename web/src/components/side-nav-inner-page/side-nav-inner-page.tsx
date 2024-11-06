import { Box } from "@radix-ui/themes";
import SideNavItem from "./side-nav-item";

interface SideNavInnerPageProps {
	paths: {
		href: string;
		title: string;
		selectionCriteria: string[];
	}[];
	basePath: string;
}

export default function SideNavInnerPage({
	paths,
	basePath,
}: SideNavInnerPageProps) {
	return (
		<Box mt="4" width="165px">
			{paths.map((item, idx) => (
				<SideNavItem
					key={`side_nav_${idx}`}
					href={item.href}
					title={item.title}
					selectionCriteria={item.selectionCriteria}
					basePath={basePath}
				/>
			))}
		</Box>
	);
}
