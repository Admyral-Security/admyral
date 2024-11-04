"use client";

import { Badge, Box, Flex, HoverCard, Separator } from "@radix-ui/themes";
import Logo from "@/components/icons/logo";
import Link from "next/link";
import SettingsIcon from "@/components/icons/settings-icon";
import WorkflowOverviewIcon from "@/components/icons/workflow-overview-icon";
import DashboardIcon from "@/components/icons/dashboard-icon";
import Image from "next/image";
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
					<NavLink
						pageName="Dashboard"
						linkHref="/dashboard"
						icon={<DashboardIcon />}
						selectionCriteria={["/dashboard"]}
					/>

					<NavLink
						pageName="Workflow Overview"
						linkHref="/"
						icon={<WorkflowOverviewIcon />}
						selectionCriteria={["/", "/workflows"]}
					/>

					<Separator size="2" color="gray" />

					<HoverCard.Root>
						<HoverCard.Trigger>
							<Link
								href="https://discord.com/invite/GqbJZT9Hbf"
								target="_blank"
								rel="noopener noreferrer"
							>
								<Image
									src="/discord_logo.svg"
									alt="Discord"
									width={18}
									height={18}
								/>
							</Link>
						</HoverCard.Trigger>
						<HoverCard.Content style={{ padding: 0 }}>
							<Badge size="3" color="green">
								Join us on Discord!
							</Badge>
						</HoverCard.Content>
					</HoverCard.Root>

					<HoverCard.Root>
						<HoverCard.Trigger>
							<Link
								href="https://github.com/admyral-security/admyral"
								target="_blank"
								rel="noopener noreferrer"
							>
								<Image
									src="/github_logo.svg"
									alt="Slack"
									width={18}
									height={18}
								/>
							</Link>
						</HoverCard.Trigger>
						<HoverCard.Content style={{ padding: 0 }}>
							<Badge size="3" color="green">
								Visit us on GitHub!
							</Badge>
						</HoverCard.Content>
					</HoverCard.Root>
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
