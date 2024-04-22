import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecsPatterns from "aws-cdk-lib/aws-ecs-patterns";
import * as iam from "aws-cdk-lib/aws-iam";

export class AdmyralStack extends cdk.Stack {
	constructor(scope: Construct, id: string, props?: cdk.StackProps) {
		super(scope, id, props);

		const vpc = new ec2.Vpc(this, "AdmyralVpc", {
			natGateways: 1,
			maxAzs: 2,
			subnetConfiguration: [
				{
					subnetType: ec2.SubnetType.PUBLIC,
					name: "public",
				},
				{
					subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
					name: "private",
				},
			],
		});

		const cluster = new ecs.Cluster(this, "AdmyralCluster", {
			vpc,
		});

		const backendService =
			new ecsPatterns.ApplicationLoadBalancedFargateService(
				this,
				"AdmyralBackendService",
				{
					taskImageOptions: {
						image: ecs.ContainerImage.fromAsset("../../backend"),
						containerPort: 80,
						enableLogging: true,
						environment: {
							DATABASE_URL:
								process.env.DATABASE_URL_WITH_ASYNCPG!,
							JWT_SECRET: process.env.JWT_SECRET!,
						},
					},
					cpu: 512,
					memoryLimitMiB: 1024,
					cluster,
					desiredCount: 1,
					publicLoadBalancer: true,
					runtimePlatform: {
						cpuArchitecture: ecs.CpuArchitecture.ARM64,
						operatingSystemFamily: ecs.OperatingSystemFamily.LINUX,
					},
				},
			);

		// Allow backendService to pull images from ECR
		backendService.service.taskDefinition.executionRole!.addManagedPolicy(
			iam.ManagedPolicy.fromAwsManagedPolicyName(
				"AmazonEC2ContainerRegistryReadOnly",
			),
		);

		// Configure health check for backendService
		backendService.targetGroup.configureHealthCheck({
			path: "/health",
			interval: cdk.Duration.seconds(30),
			timeout: cdk.Duration.seconds(10),
		});

		const workflowRunnerService =
			new ecsPatterns.ApplicationLoadBalancedFargateService(
				this,
				"AdmyralWorkflowRunnerService",
				{
					taskImageOptions: {
						image: ecs.ContainerImage.fromAsset(
							"../../workflow-runner",
						),
						containerPort: 80,
						enableLogging: true,
						environment: {
							JWT_SECRET: process.env.JWT_SECRET!,
							DATABASE_URL: process.env.DATABASE_URL!,
							DATABASE_CONNECTION_POOL_SIZE:
								process.env.DATABASE_CONNECTION_POOL_SIZE!,
							CREDENTIALS_SECRET: process.env.CREDENTIALS_SECRET!,
							OPENAI_API_KEY: process.env.OPENAI_API_KEY!,
						},
					},
					cpu: 512,
					memoryLimitMiB: 1024,
					cluster,
					desiredCount: 1,
					publicLoadBalancer: true,
					runtimePlatform: {
						cpuArchitecture: ecs.CpuArchitecture.ARM64,
						operatingSystemFamily: ecs.OperatingSystemFamily.LINUX,
					},
				},
			);

		// Allow workflowRunnerService to pull images from ECR
		workflowRunnerService.service.taskDefinition.executionRole!.addManagedPolicy(
			iam.ManagedPolicy.fromAwsManagedPolicyName(
				"AmazonEC2ContainerRegistryReadOnly",
			),
		);

		// Configure health check for workflowRunnerService
		workflowRunnerService.targetGroup.configureHealthCheck({
			path: "/health",
			interval: cdk.Duration.seconds(30),
			timeout: cdk.Duration.seconds(10),
		});
	}
}
