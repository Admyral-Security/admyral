#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { AdmyralStack } from "../lib/admyral-stack";

const app = new cdk.App();
new AdmyralStack(app, "Admyral", {
	env: { account: process.env.AWS_ACCOUNT_ID, region: "eu-central-1" },
});
