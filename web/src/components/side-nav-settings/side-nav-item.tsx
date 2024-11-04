"use client";

import { cn } from "@/utils/tailwind";
import { Flex, Text } from "@radix-ui/themes";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface SideNavItemProps {
	href: string;
	title: string;
	selectionCriteria: string[];
	basePath: string;
}

export default function SideNavItem({
	title,
	href,
	selectionCriteria,
	basePath,
}: SideNavItemProps) {
	const pathname = usePathname();
	const isSelected = selectionCriteria.some(
		(criteria) =>
			(criteria === basePath && pathname === criteria) ||
			(criteria !== basePath && pathname.startsWith(criteria)),
	);

	const activateBackground = isSelected ? "bg-gray-200" : "";
	const defaultClassName = "rounded cursor-pointer hover:bg-gray-200";

	return (
		<Link href={href}>
			<Flex
				width="135px"
				align="center"
				className={cn(defaultClassName, activateBackground)}
				mx="2"
				mt="1"
				px="2"
				py="2"
			>
				<Text size="2" weight={isSelected ? "bold" : "medium"}>
					{title}
				</Text>
			</Flex>
		</Link>
	);
}
