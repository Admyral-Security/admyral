"use client";

import { Text, Badge } from "@radix-ui/themes";
import {
	Card,
	Metric,
	Text as TremorText,
	Title,
	Grid,
	AreaChart,
	DateRangePicker,
	DateRangePickerValue,
} from "@tremor/react";

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
		name: "Controls Implemented",
		stat: "141 of 150",
		change: "+2",
		changeType: "positive",
	},
	{
		name: "Time saved",
		stat: "91%",
		change: "+2.1%",
		changeType: "positive",
	},
	{
		name: "Controls Requiring Action",
		stat: "5",
		change: "-15%",
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
	},
	{
		date: "Feb",
		"Control Compliance": 135,
	},
	{
		date: "Mar",
		"Control Compliance": 125,
	},
	{
		date: "Apr",
		"Control Compliance": 140,
	},
	{
		date: "May",
		"Control Compliance": 132,
	},
	{
		date: "Jun",
		"Control Compliance": 128,
	},
	{
		date: "Jul 23",
		"Control Compliance": 137,
	},
	{
		date: "Aug 23",
		"Control Compliance": 133,
	},
	{
		date: "Sep 23",
		"Control Compliance": 129,
	},
	{
		date: "Oct 23",
		"Control Compliance": 138,
	},
	{
		date: "Nov 23",
		"Control Compliance": 127,
	},
	{
		date: "Dec 23",
		"Control Compliance": 136,
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
		status: "Pending Review",
		last_reviewed: "2024-01-01 10:00:00",
		description: "This is a description of the control",
		link: "https://example.com/control/3",
	},
	{
		control: "CC2.1.5",
		status: "Pending Review",
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
		"Control Executions": 6070,
	},
	{
		date: "Feb",
		"Control Executions": 6200,
	},
	{
		date: "Mar",
		"Control Executions": 6200,
	},
	{
		date: "Apr",
		"Control Executions": 6500,
	},
	{
		date: "May",
		"Control Executions": 6700,
	},
	{
		date: "Jun",
		"Control Executions": 6900,
	},
	{
		date: "Jul 23",
		"Control Executions": 7400,
	},
	{
		date: "Aug 23",
		"Control Executions": 7400,
	},
	{
		date: "Sep 23",
		"Control Executions": 7500,
	},
	{
		date: "Oct 23",
		"Control Executions": 7700,
	},
	{
		date: "Nov 23",
		"Control Executions": 7900,
	},
	{
		date: "Dec 23",
		"Control Executions": 8100,
	},
];

const alertData = [
	{
		summary: "Vulnerability SLA Breach",
		channel: "Slack",
		triggered: "2024-01-01 10:00:00",
		severity: "Critical",
		link: "https://example.com/alert/1",
	},
	{
		summary: "Privileged Access Change",
		channel: "Jira",
		triggered: "2024-01-02 11:00:00",
		severity: "High",
		link: "https://example.com/alert/2",
	},
	{
		summary: "Security Tool Disabled",
		channel: "Slack",
		triggered: "2024-01-03 12:00:00",
		severity: "Medium",
		link: "https://example.com/alert/3",
	},
	{
		summary: "Devices not encrypted",
		channel: "Jira",
		triggered: "2024-01-04 13:00:00",
		severity: "Low",
		link: "https://example.com/alert/4",
	},
	{
		summary: "MFA Disabled for User",
		channel: "Slack",
		triggered: "2024-01-05 14:00:00",
		severity: "High",
		link: "https://example.com/alert/5",
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

export default function Dashboard() {
	return (
		<div className="p-6">
			<Title>Compliance Control Monitoring</Title>

			{/* Date Range Picker */}
			<DateRangePicker
				className="max-w-sm mt-2 bg-white rounded-lg"
				enableSelect={true}
			/>

			{/* New KPI Cards */}
			<dl className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mt-6">
				{kpiData.map((item) => (
					<Card key={item.name}>
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
						<dd className="text-tremor-metric font-semibold text-tremor-content-strong dark:text-dark-tremor-content-strong">
							{item.stat}
						</dd>
					</Card>
				))}
			</dl>

			{/* Area Chart */}
			<Card className="mt-6">
				<Title>Passing Controls Over Time</Title>
				<AreaChart
					className="h-64"
					data={chartdata}
					stack={true}
					index="date"
					categories={["Control Compliance"]}
					colors={["blue"]}
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
					<Title>Control Compliance Status</Title>
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
					{
						name: "Okta",
						logo: "/okta_logo.png",
						controls: 12,
					},
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
							{tool.controls} Controls
						</Metric>
					</Card>
				))}
			</dl>

			{/* List of Alerts Table */}
			<div className="grid grid-cols-1 gap-6 mt-6">
				<Card>
					<Title>List of Open Alerts</Title>
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
									<TableHeaderCell>Triggered</TableHeaderCell>
									<TableHeaderCell>Severity</TableHeaderCell>
									<TableHeaderCell>
										Link to Alert
									</TableHeaderCell>
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
															: "/jira_logo.svg"
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
																: "blue"
												}
												variant="outline"
											>
												{item.severity}
											</Badge>
										</TableCell>
										<TableCell>
											<a
												href={item.link}
												target="_blank"
												rel="noopener noreferrer"
												className="text-blue-600 hover:text-blue-800"
											>
												View Alert
											</a>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</TableRoot>
				</Card>
			</div>

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
		</div>
	);
}
