import { ChevronRightIcon } from "@radix-ui/react-icons";
import * as Accordion from "@radix-ui/react-accordion";
import React from "react";
import { TActionNamespace } from "@/types/editor-actions";
import EditorActionCard from "./editor-action-card";
import NamespaceIcon from "./namespace-icon";
import { Flex, Text } from "@radix-ui/themes";

export default function ActionAccordion({
	actionNamespace,
}: {
	actionNamespace: TActionNamespace;
}) {
	return (
		<Accordion.Root type="single" collapsible>
			<Accordion.Item className="overflow-hidden" value="item-1">
				<Accordion.Header>
					<Accordion.Trigger
						className="group"
						style={{ width: "100%", padding: "8px 0px" }}
					>
						<Flex width="100%" justify="between" align="center">
							<Flex gap="2" align="center">
								<NamespaceIcon
									namespace={actionNamespace.namespace}
								/>
								<Text
									size="2"
									weight="medium"
									style={{
										color: "var(--Tokens-Colors-text, #1C2024)",
									}}
								>
									{actionNamespace.namespace}
								</Text>
							</Flex>

							<ChevronRightIcon
								className="ease-[cubic-bezier(0.87,_0,_0.13,_1)] transition-transform duration-300 group-data-[state=open]:rotate-90"
								aria-hidden
							/>
						</Flex>
					</Accordion.Trigger>
				</Accordion.Header>

				<Accordion.Content className="data-[state=open]:animate-slideDown data-[state=closed]:animate-slideUp overflow-hidden">
					<Flex direction="column" gap="2">
						{actionNamespace.actions.map((action) => (
							<EditorActionCard
								key={`action_${action.displayNamespace}_${action.actionType}`}
								label={action.displayName || action.actionType}
								actionType={action.actionType}
								hideIcon={true}
							/>
						))}
					</Flex>
				</Accordion.Content>
			</Accordion.Item>
		</Accordion.Root>
	);
}
