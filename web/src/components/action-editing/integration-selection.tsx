"use client";

import { Box, Card, Flex, Text } from "@radix-ui/themes";
import { ActionData, ActionNode } from "@/lib/types";
import { IntegrationType } from "@/lib/integrations";
import useWorkflowStore from "@/lib/workflow-store";
import RightArrowIcon from "../icons/right-arrow-icon";
import IntegrationLogoIconCard from "../integration-logo-icon-card";
import { initActionData } from "@/lib/workflows";
import _ from "lodash";
import { INTEGRATIONS } from "@/lib/integrations";
import { useState } from "react";
import BackIcon from "../icons/back-icon";
import { generateReferenceHandle } from "@/lib/workflow-node";
import QuestionAnswerIcon from "../icons/question-answer-icon";

interface IntegrationListElementProps {
	integration?: IntegrationType;
	description: string;
	onClick: () => void;
}

function IntegrationListElement({
	integration,
	description,
	onClick,
}: IntegrationListElementProps) {
	return (
		<Card
			variant="ghost"
			style={{
				cursor: "pointer",
			}}
			onClick={onClick}
		>
			<Flex justify="between" align="center">
				<Flex gap="4" align="center">
					<IntegrationLogoIconCard integration={integration} />

					<Flex direction="column">
						<Text weight="medium">
							{integration === undefined
								? "HTTP Request"
								: INTEGRATIONS[integration].name}
						</Text>
						<Text color="gray" weight="light">
							{description}
						</Text>
					</Flex>
				</Flex>

				<RightArrowIcon />
			</Flex>
		</Card>
	);
}

interface IntegrationApiListElementProps {
	apiName: string;
	description: string;
	onClick: () => void;
}

function IntegrationApiListElement({
	apiName,
	description,
	onClick,
}: IntegrationApiListElementProps) {
	return (
		<Card variant="ghost" onClick={onClick} style={{ cursor: "pointer" }}>
			<Flex justify="between" align="center">
				<Flex gap="4" align="center">
					<Flex direction="column">
						<Text weight="medium">{apiName}</Text>
						<Text color="gray" weight="light" size="1">
							{description}
						</Text>
					</Flex>
				</Flex>
			</Flex>
		</Card>
	);
}

export interface IntegrationProps {
	id: string;
}

export default function IntegrationSelection({ id }: IntegrationProps) {
	const [selectedIntegration, setSelectedIntegration] =
		useState<IntegrationType | null>(null);

	const { data, updateNodeData } = useWorkflowStore((state) => ({
		data: state.nodes.find((node) => node.id === id)?.data as ActionData,
		updateNodeData: state.updateNodeData,
	}));

	const handleHttpRequestSetup = async () => {
		const newData = await initActionData(
			ActionNode.HTTP_REQUEST,
			data.actionId,
			"HTTP Request",
			data.xPosition,
			data.yPosition,
		);
		updateNodeData(id, newData);
	};

	const handleIntegrationApiSetup = async (
		integrationType: IntegrationType,
		apiIdx: number,
	) => {
		const actionName = `${INTEGRATIONS[integrationType].name} - ${INTEGRATIONS[integrationType].apis[apiIdx].name}`;
		const newData = {
			...data,
			actionName,
			referenceHandle: generateReferenceHandle(actionName),
			actionDescription:
				INTEGRATIONS[integrationType].apis[apiIdx].description,
			actionDefinition: {
				integrationType,
				api: INTEGRATIONS[integrationType].apis[apiIdx].id,
				params: {},
				credential: "",
			},
		};
		updateNodeData(id, newData);
	};

	if (selectedIntegration !== null) {
		return (
			<>
				<Flex direction="column" gap="4" p="4">
					<Card
						variant="ghost"
						onClick={() => setSelectedIntegration(null)}
						style={{
							cursor: "pointer",
						}}
					>
						<Flex justify="between" align="center">
							<Flex gap="4" align="center">
								<Box>
									<BackIcon />
								</Box>

								<IntegrationLogoIconCard
									integration={selectedIntegration}
								/>

								<Flex direction="column">
									<Text>
										{INTEGRATIONS[selectedIntegration].name}
									</Text>
									<Text color="gray" weight="light">
										{`${INTEGRATIONS[selectedIntegration].apis.length} available APIs`}
									</Text>
								</Flex>
							</Flex>
						</Flex>
					</Card>

					{/* TODO: search bar */}

					{INTEGRATIONS[selectedIntegration].apis.map((api, idx) => (
						<IntegrationApiListElement
							key={`integration_api_selection_${api.id}`}
							apiName={api.name}
							description={api.description}
							onClick={() =>
								handleIntegrationApiSetup(
									selectedIntegration,
									idx,
								)
							}
						/>
					))}
				</Flex>

				<a
					href="mailto:chris@admyral.dev"
					style={{
						position: "fixed",
						right: 16,
						bottom: 16,
					}}
				>
					<Flex gap="2" align="center">
						<QuestionAnswerIcon />
						<Text>Request API</Text>
					</Flex>
				</a>
			</>
		);
	}

	return (
		<>
			<Flex direction="column" gap="4" p="4">
				<IntegrationListElement
					description="Configure manually"
					onClick={handleHttpRequestSetup}
				/>

				{/* TODO: search bar */}

				{Object.keys(INTEGRATIONS).map((integrationType) => (
					<IntegrationListElement
						key={`integration_selection_${integrationType}`}
						integration={integrationType as IntegrationType}
						description={`${INTEGRATIONS[integrationType].apis.length} available APIs`}
						onClick={() =>
							setSelectedIntegration(
								integrationType as IntegrationType,
							)
						}
					/>
				))}
			</Flex>

			<a
				href="mailto:chris@admyral.dev"
				style={{
					position: "fixed",
					right: 16,
					bottom: 16,
				}}
			>
				<Flex gap="2" align="center">
					<QuestionAnswerIcon />
					<Text>Request Integration</Text>
				</Flex>
			</a>
		</>
	);
}
