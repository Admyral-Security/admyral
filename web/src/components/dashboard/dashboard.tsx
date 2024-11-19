"use client";

import { Badge, Flex } from "@radix-ui/themes";
import { Select } from "@radix-ui/themes";
import { Card, Metric, Title, AreaChart, DateRangePicker } from "@tremor/react";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeaderCell,
	TableRoot,
	TableRow,
} from "@/components/table";
import Image from "next/image";

function classNames(...classes: string[]) {
	return classes.filter(Boolean).join(" ");
}

const kpiData = [
	{
		name: "Policies Requiring Action",
		stat: "1",
		change: "-12",
		changeType: "positive",
	},
	{
		name: "Controls Passing",
		stat: "91%",
		change: "+2.1%",
		changeType: "positive",
	},
	{
		name: "Controls Implemented",
		stat: "150",
		change: "+2",
		changeType: "positive",
	},
	{
		name: "Alerts Created",
		stat: "5",
		change: "+50%",
		changeType: "negative",
	},
];

const chartdata = [
	{
		date: "Jan",
		"Control Compliance": 130,
		"Total Controls": 20,
	},
	{
		date: "Feb",
		"Control Compliance": 135,
		"Total Controls": 15,
	},
	{
		date: "Mar",
		"Control Compliance": 125,
		"Total Controls": 25,
	},
	{
		date: "Apr",
		"Control Compliance": 140,
		"Total Controls": 10,
	},
	{
		date: "May",
		"Control Compliance": 132,
		"Total Controls": 18,
	},
	{
		date: "Jun",
		"Control Compliance": 128,
		"Total Controls": 22,
	},
	{
		date: "Jul 23",
		"Control Compliance": 137,
		"Total Controls": 13,
	},
	{
		date: "Aug 23",
		"Control Compliance": 133,
		"Total Controls": 17,
	},
	{
		date: "Sep 23",
		"Control Compliance": 129,
		"Total Controls": 21,
	},
	{
		date: "Oct 23",
		"Control Compliance": 138,
		"Total Controls": 12,
	},
	{
		date: "Nov 23",
		"Control Compliance": 127,
		"Total Controls": 23,
	},
	{
		date: "Dec 23",
		"Control Compliance": 136,
		"Total Controls": 14,
	},
];

const tableData = [
	{
		control: "CC2.1.2",
		status: "Fail",
		last_reviewed: "2024-01-01 10:00:00",
		description: "This is a description of the control",
		link: "https://example.com/control/1",
	},
	{
		control: "CC2.2.2",
		status: "Fail",
		last_reviewed: "2024-01-01 10:00:00",
		description: "This is a description of the control",
		link: "https://example.com/control/2",
	},
	{
		control: "CC3.1.2",
		status: "Fail",
		last_reviewed: "2024-01-01 10:00:00",
		description: "This is a description of the control",
		link: "https://example.com/control/3",
	},
	{
		control: "CC2.1.5",
		status: "Fail",
		last_reviewed: "2024-01-01 10:00:00",
		description: "This is a description of the control",
		link: "https://example.com/control/4",
	},
	{
		control: "CC2.1.6",
		status: "Fail",
		last_reviewed: "2024-01-01 10:00:00",
		description: "This is a description of the control",
		link: "https://example.com/control/5",
	},
];

const controlMonitoringData = [
	{
		date: "Jan",
		"Control Executions": 3070,
	},
	{
		date: "Feb",
		"Control Executions": 3200,
	},
	{
		date: "Mar",
		"Control Executions": 3200,
	},
	{
		date: "Apr",
		"Control Executions": 3500,
	},
	{
		date: "May",
		"Control Executions": 3700,
	},
	{
		date: "Jun",
		"Control Executions": 3900,
	},
	{
		date: "Jul 23",
		"Control Executions": 4400,
	},
	{
		date: "Aug 23",
		"Control Executions": 4400,
	},
	{
		date: "Sep 23",
		"Control Executions": 4500,
	},
	{
		date: "Oct 23",
		"Control Executions": 4700,
	},
	{
		date: "Nov 23",
		"Control Executions": 4900,
	},
	{
		date: "Dec 23",
		"Control Executions": 5100,
	},
];

const alertData = [
	{
		summary: "Fix Cryptography Policy for SOC2",
		channel: "Admyral",
		triggered: "2024-11-18 10:00:00",
		severity: "High",
		link: "/policies/audit",
		canResolveWithAI: true,
	},
	{
		summary: "Privileged Access Change",
		channel: "Jira",
		triggered: "2024-11-18 11:00:00",
		severity: "High",
		link: "https://example.com/alert/2",
		canResolveWithAI: false,
	},
	{
		summary: "Security Tool Disabled",
		channel: "Slack",
		triggered: "2024-11-18 12:00:00",
		severity: "Medium",
		link: "https://example.com/alert/3",
		canResolveWithAI: false,
	},
	{
		summary: "Devices not encrypted",
		channel: "Jira",
		triggered: "2024-11-18 13:00:00",
		severity: "Low",
		link: "https://example.com/alert/4",
		canResolveWithAI: false,
	},
	{
		summary: "MFA Disabled for User",
		channel: "Slack",
		triggered: "2024-11-18 14:00:00",
		severity: "High",
		link: "https://example.com/alert/5",
		canResolveWithAI: false,
	},
];

const alertTimelineData = [
	{
		date: "Jan",
		Critical: 3,
		High: 2,
		Medium: 1,
		Low: 1,
	},
	{
		date: "Feb",
		Critical: 2,
		High: 3,
		Medium: 2,
		Low: 1,
	},
	{
		date: "Mar",
		Critical: 4,
		High: 1,
		Medium: 2,
		Low: 1,
	},
	{
		date: "Apr",
		Critical: 1,
		High: 2,
		Medium: 3,
		Low: 2,
	},
	{
		date: "May",
		Critical: 3,
		High: 1,
		Medium: 2,
		Low: 1,
	},
	{
		date: "Jun",
		Critical: 2,
		High: 2,
		Medium: 1,
		Low: 1,
	},
	{
		date: "Jul 23",
		Critical: 1,
		High: 1,
		Medium: 2,
		Low: 2,
	},
	{
		date: "Aug 23",
		Critical: 2,
		High: 2,
		Medium: 1,
		Low: 1,
	},
	{
		date: "Sep 23",
		Critical: 1,
		High: 1,
		Medium: 2,
		Low: 1,
	},
	{
		date: "Oct 23",
		Critical: 2,
		High: 1,
		Medium: 1,
		Low: 1,
	},
	{
		date: "Nov 23",
		Critical: 1,
		High: 1,
		Medium: 2,
		Low: 1,
	},
	{
		date: "Dec 23",
		Critical: 1,
		High: 1,
		Medium: 1,
		Low: 1,
	},
];

const policyData = [
	{
		policyName: "Access Control Policy",
		lastReviewDate: "2024-12-01",
		nextReviewDue: "2025-12-01",
		status: "On Time",
		daysUntilReview: 365,
	},
	{
		policyName: "Asset Management Policy",
		lastReviewDate: "2024-11-15",
		nextReviewDue: "2025-11-15",
		status: "On Time",
		daysUntilReview: 361,
	},
	{
		policyName: "Cryptography Policy",
		lastReviewDate: "2024-10-20",
		nextReviewDue: "2025-10-20",
		status: "On Time",
		daysUntilReview: 335,
	},
	{
		policyName: "Acceptable Use Policy",
		lastReviewDate: "2024-09-10",
		nextReviewDue: "2025-09-10",
		status: "On Time",
		daysUntilReview: 295,
	},
	{
		policyName: "Business Continuity Policy",
		lastReviewDate: "2024-08-05",
		nextReviewDue: "2025-08-05",
		status: "On Time",
		daysUntilReview: 259,
	},
];

export default function Dashboard() {
	return (
		<div className="p-6">
			{/* Date Range Picker */}
			<Flex justify="between">
				<DateRangePicker
					className="max-w-sm mt-2 bg-white rounded-lg"
					enableSelect={true}
				/>

				<Select.Root>
					<Select.Trigger placeholder="Select Framework" />
					<Select.Content>
						<Select.Item value="ALL">All Frameworks</Select.Item>
						<Select.Item value="SOC2">SOC2 Type II</Select.Item>
						<Select.Item value="HIPAA">HIPAA</Select.Item>
						<Select.Item value="ISO27001">ISO27001</Select.Item>
						<Select.Item value="PCIDSS">PCI DSS</Select.Item>
					</Select.Content>
				</Select.Root>
			</Flex>

			<Title className="mt-6">Compliance Overview</Title>

			{/* New KPI Cards */}
			<dl className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mt-6">
				{kpiData.map((item) => (
					<Card
						key={item.name}
						className="transition-shadow hover:shadow-lg"
					>
						<div className="flex items-center justify-between">
							<dt className="text-tremor-default font-medium text-tremor-content dark:text-dark-tremor-content">
								{item.name}
							</dt>
							<span
								className={classNames(
									item.changeType === "positive"
										? "bg-emerald-100 text-emerald-800 ring-emerald-600/10 dark:bg-emerald-400/10 dark:text-emerald-500 dark:ring-emerald-400/20"
										: "bg-red-100 text-red-800 ring-red-600/10 dark:bg-red-400/10 dark:text-red-500 dark:ring-red-400/20",
									"inline-flex items-center rounded-tremor-small px-2 py-1 text-tremor-label font-medium ring-1 ring-inset",
								)}
							>
								{item.change}
							</span>
						</div>
						<dd className="text-tremor-metric font-semibold text-lg dark:text-dark-tremor-content-strong">
							{item.stat}
						</dd>
					</Card>
				))}
			</dl>

			{/* Compliance Cards */}
			<dl className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mt-6">
				{[
					{
						name: "SOC2 Type II",
						logo: "/soc2_type2_logo.svg",
						controls: "100%",
					},
					{
						name: "HIPAA",
						logo: "/hipaa_logo.svg",
						controls: "100%",
					},
					{
						name: "ISO27001:2022",
						logo: "/iso27001_logo.svg",
						controls: "85%",
					},
					{
						name: "PCI DSS",
						logo: "/pci_dss_logo.svg",
						controls: "75%",
					},
				].map((tool) => (
					<Card
						key={tool.name}
						className="flex flex-row items-center justify-between p-4 bg-white rounded-lg transition-shadow hover:shadow-lg"
					>
						<div className="flex-1 flex flex-col items-center justify-center h-full">
							<Image
								src={tool.logo}
								alt={tool.name}
								width={50}
								height={50}
							/>
							<div className="mt-2 text-center text-sm font-medium text-gray-800">
								{tool.name}
							</div>
						</div>
						<div className="flex-1 flex flex-col items-center justify-center text-center">
							<Metric
								className={`text-lg font-bold ${
									tool.controls === "100%"
										? "text-green-600"
										: "text-red-600"
								}`}
							>
								{tool.controls}
							</Metric>
							<div className="text-md text-gray-500">
								of Controls Passing
							</div>
						</div>
					</Card>
				))}
			</dl>

			<Title className="mt-6">Policies</Title>

			<Card className="mt-6">
				<Title>Policy Review Status</Title>
				<TableRoot>
					<Table>
						<TableHead>
							<TableRow>
								<TableHeaderCell>Policy Name</TableHeaderCell>
								<TableHeaderCell>
									Last Review Date
								</TableHeaderCell>
								<TableHeaderCell>
									Next Review Due
								</TableHeaderCell>
								<TableHeaderCell>Status</TableHeaderCell>
								<TableHeaderCell>
									Days Until Review
								</TableHeaderCell>
							</TableRow>
						</TableHead>
						<TableBody>
							{policyData.map((item: any) => (
								<TableRow key={item.policyName}>
									<TableCell>{item.policyName}</TableCell>
									<TableCell>{item.lastReviewDate}</TableCell>
									<TableCell>{item.nextReviewDue}</TableCell>
									<TableCell>
										<Badge
											color={
												item.status === "On Time"
													? "green"
													: "red"
											}
										>
											{item.status}
										</Badge>
									</TableCell>
									<TableCell>
										{item.daysUntilReview}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</TableRoot>
			</Card>

			<Title className="mt-6">Controls</Title>

			{/* Area Chart */}
			<Card className="mt-6">
				<Title>% of Passing Controls Over Time</Title>
				<AreaChart
					className="h-64"
					data={chartdata}
					stack={true}
					index="date"
					categories={["Control Compliance", "Total Controls"]}
					colors={["lime", "blue"]}
					showAnimation={true}
					valueFormatter={(number: number) =>
						`${Intl.NumberFormat("us").format(number).toString()}`
					}
					onValueChange={(v) => console.log(v)}
				/>
			</Card>

			{/* Table */}
			<div className="grid grid-cols-1 gap-6 mt-6">
				<Card>
					<Title>Failing Controls</Title>
					<TableRoot>
						<Table>
							<TableHead>
								<TableRow>
									<TableHeaderCell>Control</TableHeaderCell>
									<TableHeaderCell>Status</TableHeaderCell>
									<TableHeaderCell>
										Last Execution
									</TableHeaderCell>
									<TableHeaderCell>
										Control Description
									</TableHeaderCell>
									<TableHeaderCell>
										Link to Control
									</TableHeaderCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{tableData.map((item: any) => (
									<TableRow key={item.control}>
										<TableCell>{item.control}</TableCell>
										<TableCell>
											<Badge
												color={
													item.status === "Pass"
														? "green"
														: item.status === "Fail"
															? "red"
															: "yellow"
												}
												variant="outline"
											>
												{item.status}
											</Badge>
										</TableCell>
										<TableCell>
											{item.last_reviewed}
										</TableCell>
										<TableCell>
											{item.description}
										</TableCell>
										<TableCell>
											<a
												href={item.link}
												target="_blank"
												rel="noopener noreferrer"
												className="text-blue-600 hover:text-blue-800"
											>
												View Control
											</a>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</TableRoot>
				</Card>
			</div>

			{/* New Area Chart */}
			<Card className="mt-6">
				<Title>Total Control Monitoring Executions</Title>
				<AreaChart
					className="h-64"
					data={controlMonitoringData}
					stack={true}
					index="date"
					categories={["Control Executions"]}
					colors={["blue"]}
					showAnimation={true}
					valueFormatter={(number: number) =>
						`${Intl.NumberFormat("us").format(number).toString()}`
					}
					onValueChange={(v) => console.log(v)}
				/>
			</Card>

			{/* Tool Cards */}
			<dl className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mt-6">
				{[
					{ name: "Github", logo: "/github_logo.svg", controls: 10 },
					{ name: "AWS", logo: "/aws_logo.svg", controls: 15 },
					{ name: "Kandji", logo: "/kandji_logo.svg", controls: 8 },
					{ name: "Okta", logo: "/okta_logo.png", controls: 12 },
				].map((tool) => (
					<Card
						key={tool.name}
						className="flex flex-col items-center justify-center"
					>
						<Image
							src={tool.logo}
							alt={tool.name}
							width={50}
							height={50}
						/>
						<Title className="mt-4">{tool.name}</Title>
						<Metric className="mt-2">
							{tool.controls} Controls Passing
						</Metric>
					</Card>
				))}
			</dl>

			<Title className="mt-6">Command Center</Title>

			{/* Alert Timeline Chart */}
			<Card className="mt-6">
				<Title>Created Alerts Timeline</Title>
				<AreaChart
					className="h-64"
					data={alertTimelineData}
					stack={true}
					showAnimation={true}
					index="date"
					categories={["Critical", "High", "Medium", "Low"]}
					colors={["fuchsia", "pink", "amber", "lime"]}
					valueFormatter={(number: number) =>
						`${Intl.NumberFormat("us").format(number).toString()}`
					}
					onValueChange={(v) => console.log(v)}
				/>
			</Card>

			{/* List of Alerts Table */}
			<div className="grid grid-cols-1 gap-6 mt-6">
				<Card>
					<Title>Open Alerts</Title>
					<TableRoot>
						<Table>
							<TableHead>
								<TableRow>
									<TableHeaderCell>
										Alert Summary
									</TableHeaderCell>
									<TableHeaderCell>
										Notification Channel
									</TableHeaderCell>
									<TableHeaderCell>Created</TableHeaderCell>
									<TableHeaderCell>Severity</TableHeaderCell>
									<TableHeaderCell>Actions</TableHeaderCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{alertData.map((item: any) => (
									<TableRow key={item.summary}>
										<TableCell>{item.summary}</TableCell>
										<TableCell>
											<div className="flex items-center gap-2">
												<Image
													src={
														item.channel === "Slack"
															? "/slack_logo.svg"
															: item.channel ===
																  "Jira"
																? "/jira_logo.svg"
																: "/admyral_logo.svg"
													}
													alt={item.channel}
													width={20}
													height={20}
												/>
												{item.channel}
											</div>
										</TableCell>
										<TableCell>{item.triggered}</TableCell>
										<TableCell>
											<Badge
												color={
													item.severity === "Critical"
														? "pink"
														: item.severity ===
															  "High"
															? "red"
															: item.severity ===
																  "Medium"
																? "yellow"
																: "lime"
												}
												variant="outline"
											>
												{item.severity}
											</Badge>
										</TableCell>
										<TableCell>
											<div className="flex gap-2">
												{item.canResolveWithAI ? (
													<a
														href={item.link}
														className="flex items-center text-blue-600 hover:text-blue-800"
														onClick={() => {
															// Add your AI resolve logic here
															console.log(
																"Resolve with AI clicked",
															);
														}}
													>
														Resolve with AI ✨
													</a>
												) : (
													<a
														href={item.link}
														target="_blank"
														rel="noopener noreferrer"
														className="text-blue-600 hover:text-blue-800"
													>
														View Alert
													</a>
												)}
											</div>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</TableRoot>
				</Card>
			</div>
		</div>
	);
}
