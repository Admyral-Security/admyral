import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecsPatterns from "aws-cdk-lib/aws-ecs-patterns";
import * as iam from "aws-cdk-lib/aws-iam";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as elb2 from "aws-cdk-lib/aws-elasticloadbalancingv2";

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

		const hostedZone = route53.HostedZone.fromLookup(
			this,
			"AdmyralHostedZone",
			{
				domainName: process.env.DOMAIN_NAME!,
			},
		);

		// Backend service

		const backendServiceDomain = `backend.${process.env.DOMAIN_NAME}`;

		const backendServiceCertificate = new acm.Certificate(
			this,
			"AdmyralBackendServiceCertificate",
			{
				domainName: backendServiceDomain,
				validation: acm.CertificateValidation.fromDns(),
			},
		);

		const backendServiceEnvironment: Record<string, string> = {
			DATABASE_URL: process.env.DATABASE_URL_WITH_ASYNCPG!,
			JWT_SECRET: process.env.JWT_SECRET!,
			WEBHOOK_SIGNING_SECRET: process.env.WEBHOOK_SIGNING_SECRET!,
			OPENAI_API_KEY: process.env.OPENAI_API_KEY!,
		};
		if (process.env.WORKFLOW_RUN_HOURLY_QUOTA !== undefined) {
			backendServiceEnvironment.WORKFLOW_RUN_HOURLY_QUOTA =
				process.env.WORKFLOW_RUN_HOURLY_QUOTA;
		}
		if (process.env.WORKFLOW_RUN_TIMEOUT_IN_MINUTES !== undefined) {
			backendServiceEnvironment.WORKFLOW_RUN_TIMEOUT_IN_MINUTES =
				process.env.WORKFLOW_RUN_TIMEOUT_IN_MINUTES;
		}
		if (process.env.WORKFLOW_ASSISTANT_DAILY_QUOTA !== undefined) {
			backendServiceEnvironment.WORKFLOW_ASSISTANT_DAILY_QUOTA =
				process.env.WORKFLOW_ASSISTANT_DAILY_QUOTA;
		}

		const backendService =
			new ecsPatterns.ApplicationLoadBalancedFargateService(
				this,
				"AdmyralBackendService",
				{
					taskImageOptions: {
						image: ecs.ContainerImage.fromAsset("../../backend"),
						containerPort: 80,
						enableLogging: true,
						environment: backendServiceEnvironment,
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
					domainName: backendServiceDomain,
					certificate: backendServiceCertificate,
					domainZone: hostedZone,
					redirectHTTP: false,
					protocol: elb2.ApplicationProtocol.HTTPS,
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

		// Workflow runner service

		const workflowRunnerServiceDomain = `runner.${process.env.DOMAIN_NAME}`;

		const workflowRunnerServiceCertificate = new acm.Certificate(
			this,
			"AdmyralWorkflowRunnerServiceCertificate",
			{
				domainName: workflowRunnerServiceDomain,
				validation: acm.CertificateValidation.fromDns(hostedZone),
			},
		);

		const workflowRunnerServiceEnvironment: Record<string, string> = {
			JWT_SECRET: process.env.JWT_SECRET!,
			DATABASE_URL: process.env.DATABASE_URL!,
			DATABASE_CONNECTION_POOL_SIZE:
				process.env.DATABASE_CONNECTION_POOL_SIZE!,
			CREDENTIALS_SECRET: process.env.CREDENTIALS_SECRET!,
			OPENAI_API_KEY: process.env.OPENAI_API_KEY!,
			RESEND_API_KEY: process.env.RESEND_API_KEY!,
			RESEND_EMAIL: process.env.RESEND_EMAIL!,
		};
		if (process.env.WORKFLOW_RUN_HOURLY_QUOTA !== undefined) {
			workflowRunnerServiceEnvironment.WORKFLOW_RUN_HOURLY_QUOTA =
				process.env.WORKFLOW_RUN_HOURLY_QUOTA;
		}
		if (process.env.WORKFLOW_RUN_TIMEOUT_IN_MINUTES !== undefined) {
			workflowRunnerServiceEnvironment.WORKFLOW_RUN_TIMEOUT_IN_MINUTES =
				process.env.WORKFLOW_RUN_TIMEOUT_IN_MINUTES;
		}

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
						environment: workflowRunnerServiceEnvironment,
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
					domainName: workflowRunnerServiceDomain,
					certificate: workflowRunnerServiceCertificate,
					domainZone: hostedZone,
					redirectHTTP: false,
					protocol: elb2.ApplicationProtocol.HTTPS,
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
