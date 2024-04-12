"use client";

import { Badge, Box, Card, Flex, HoverCard } from "@radix-ui/themes";
import Logo from "./icons/logo";
import Link from "next/link";
import SettingsIcon from "./icons/settings-icon";
import WorkflowOverviewIcon from "./icons/workflow-overview-icon";
import DashboardIcon from "./icons/dashboard-icon";
import CaseManagementIcon from "./icons/case-management-icon";
import { usePathname } from "next/navigation";

interface NavLinkProps {
	pageName: string;
	linkHref: string;
	icon: React.ReactNode;
	selectionCriteria: string[];
}

function NavLink({
	pageName,
	linkHref,
	icon,
	selectionCriteria,
}: NavLinkProps) {
	const pathname = usePathname();
	const isSelected =
		selectionCriteria.filter(
			(criteria) =>
				(criteria === "/" && pathname === criteria) ||
				(criteria !== "/" && pathname.startsWith(criteria)),
		).length > 0;

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

export default function Nav() {
	return (
		<Flex
			height="100%"
			pb="5"
			pt="3"
			direction="column"
			justify="between"
			align="center"
			gap="8"
			className="border-r-2 border-r-gray-200"
		>
			<Flex direction="column" gap="9">
				<Link href="/">
					<Logo />
				</Link>

				<Flex
					direction="column"
					gap="6"
					align="center"
					justify="center"
				>
					<HoverCard.Root>
						<HoverCard.Trigger>
							<Box className="cursor-pointer">
								<DashboardIcon />
							</Box>
						</HoverCard.Trigger>
						<HoverCard.Content style={{ padding: 0 }}>
							<Badge size="3" color="orange">
								Dashboard: Coming soon!
							</Badge>
						</HoverCard.Content>
					</HoverCard.Root>

					<NavLink
						pageName="Workflows Overview"
						linkHref="/"
						icon={<WorkflowOverviewIcon />}
						selectionCriteria={["/", "/workflows"]}
					/>

					<HoverCard.Root>
						<HoverCard.Trigger>
							<Box className="cursor-pointer">
								<CaseManagementIcon />
							</Box>
						</HoverCard.Trigger>
						<HoverCard.Content style={{ padding: 0 }}>
							<Badge size="3" color="orange">
								Case Management: Coming soon!
							</Badge>
						</HoverCard.Content>
					</HoverCard.Root>
				</Flex>
			</Flex>

			<NavLink
				pageName="Settings"
				linkHref="/settings"
				icon={<SettingsIcon />}
				selectionCriteria={["/settings"]}
			/>
		</Flex>
	);
}
