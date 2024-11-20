"use client";

import { Badge, Box, Flex, HoverCard } from "@radix-ui/themes";
import Logo from "@/components/icons/logo";
import Link from "next/link";
import SettingsIcon from "@/components/icons/settings-icon";
import WorkflowOverviewIcon from "@/components/icons/workflow-overview-icon";
import DashboardIcon from "@/components/icons/dashboard-icon";
import NavLink from "./navlink";

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
			width="56px"
			style={{ position: "fixed" }}
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
						pageName="Workflow Overview"
						linkHref="/"
						icon={<WorkflowOverviewIcon />}
						selectionCriteria={["/", "/workflows"]}
					/>
				</Flex>
			</Flex>

			<Flex direction="column" align="center" justify="center">
				<NavLink
					pageName="Settings"
					linkHref="/settings"
					icon={<SettingsIcon color="#1C2024" />}
					selectionCriteria={["/settings"]}
				/>
			</Flex>
		</Flex>
	);
}
