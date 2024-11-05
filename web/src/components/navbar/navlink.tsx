"use client";

import { Badge, Card, HoverCard } from "@radix-ui/themes";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavLinkProps {
	pageName: string;
	linkHref: string;
	icon: React.ReactNode;
	selectionCriteria: string[];
}

export default function NavLink({
	pageName,
	linkHref,
	icon,
	selectionCriteria,
}: NavLinkProps) {
	const pathname = usePathname();
	const isSelected = selectionCriteria.some(
		(criteria) =>
			(criteria === "/" && pathname === criteria) ||
			(criteria !== "/" && pathname.startsWith(criteria)),
	);

	if (isSelected) {
		return (
			<Link href={linkHref}>
				<HoverCard.Root>
					<HoverCard.Trigger>
						<Card variant="ghost" className="bg-gray-200">
							{icon}
						</Card>
					</HoverCard.Trigger>

					<HoverCard.Content style={{ padding: 0 }}>
						<Badge size="3" color="gray">
							{pageName}
						</Badge>
					</HoverCard.Content>
				</HoverCard.Root>
			</Link>
		);
	}

	return (
		<Link href={linkHref}>
			<HoverCard.Root>
				<HoverCard.Trigger>
					<Card variant="ghost">{icon}</Card>
				</HoverCard.Trigger>

				<HoverCard.Content style={{ padding: 0 }}>
					<Badge size="3" color="gray">
						{pageName}
					</Badge>
				</HoverCard.Content>
			</HoverCard.Root>
		</Link>
	);
}
