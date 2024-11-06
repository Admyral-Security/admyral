"use client";

import ErrorCallout from "@/components/utils/error-callout";
import { useGetPolicy } from "@/hooks/use-get-policy";
import { useCopilotReadable } from "@copilotkit/react-core";
import { CopilotChat } from "@copilotkit/react-ui";
import { Flex } from "@radix-ui/themes";
import MDEditor from "@uiw/react-md-editor";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

const SYSTEM_INSTRUCTIONS =
	"You are a helpful assistant with expert knowledge in security compliance (e.g., SOC2, ISO27001, PCI-DSS). Answer in the best way possible given the data you have. You have access to a security policy. Answer questions about the policy truthfully.";

export default function PolicyPage() {
	const { policyId } = useParams();
	const { data: policy, isPending, error } = useGetPolicy(policyId as string);
	const [policyTitle, setPolicyTitle] = useState<string>("");
	const [value, setValue] = useState<string>("");

	useCopilotReadable({
		description: `The current policy is "${policyTitle}".`,
		value,
	});

	useEffect(() => {
		if (policy) {
			setPolicyTitle(policy.name);
			setValue(policy.content);
		}
	}, [policy]);

	if (isPending) {
		return <div>Loading...</div>;
	}

	if (error) {
		return <ErrorCallout />;
	}

	return (
		<Flex width="100%" height="100%">
			<div data-color-mode="light" className="w-full">
				<div className="wmde-markdown-var" />
				<MDEditor
					height="100%"
					style={{
						width: "100%",
					}}
					value={value}
					onChange={(newValue) => setValue(newValue || "")}
					preview="preview"
				/>
			</div>
			<Flex width={{ xl: "600px", xs: "500px" }} height="100%">
				<CopilotChat
					className="w-full"
					instructions={SYSTEM_INSTRUCTIONS}
					labels={{
						title: "Your Assistant",
						initial: "Hi! 👋 How can I assist you today?",
					}}
				/>
			</Flex>
		</Flex>
	);
}
