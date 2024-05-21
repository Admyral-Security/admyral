import { Flex, Text, TextArea, TextField } from "@radix-ui/themes";
import CopyText from "../copy-text";
import { generateReferenceHandle } from "@/lib/workflow-node";
import { cloneDeep } from "lodash";
import {
	IntegrationData,
	IntegrationType,
	getIntegrationTypeLabel,
} from "@/lib/types";
import useWorkflowStore from "@/lib/workflow-store";
import IntegrationLogoIconCard from "../integration-logo-icon-card";
import { INTEGRATIONS } from "@/lib/integrations";
import Link from "next/link";
import ArrowRightUpIcon from "../icons/arrow-right-up";

export interface IntegrationProps {
	id: string;
}

export default function Integration({ id }: IntegrationProps) {
	const { data, updateData } = useWorkflowStore((state) => ({
		data: state.nodes.find((node) => node.id === id)
			?.data as IntegrationData,
		updateData: (updatedData: IntegrationData) =>
			state.updateNodeData(id, updatedData),
	}));

	const integration =
		INTEGRATIONS[
			(data.actionDefinition as any).integrationType as IntegrationType
		];
	const apiDefinition =
		integration.apis[
			integration.apis.findIndex(
				(api) => api.id === (data.actionDefinition as any).api,
			)
		];

	return (
		<Flex direction="column" gap="4" p="4">
			<Flex gap="4" align="center">
				<IntegrationLogoIconCard
					integration={integration.integrationType}
				/>

				<Flex direction="column">
					<Text weight="medium">
						{getIntegrationTypeLabel(integration.integrationType)}
					</Text>
					<Text color="gray" weight="light">
						{apiDefinition.name}
					</Text>
					{apiDefinition.documentationUrl && (
						<Link
							href={apiDefinition.documentationUrl}
							target="_blank"
							style={{
								color: "var(--Accent-color-Accent-9, #3E63DD)",
							}}
						>
							<Flex justify="start" align="center">
								<Text>Documentation</Text>
								<ArrowRightUpIcon />
							</Flex>
						</Link>
					)}
				</Flex>
			</Flex>

			<Flex direction="column" gap="2">
				<Text>Name</Text>
				<TextField.Root
					variant="surface"
					value={data.actionName}
					onChange={(event) => {
						// Update name in the state
						const clonedData = cloneDeep(data);
						clonedData.actionName = event.target.value;
						clonedData.referenceHandle = generateReferenceHandle(
							event.target.value,
						);
						updateData(clonedData);
					}}
				/>
			</Flex>

			<Flex direction="column" gap="2">
				<Text>Reference Handle</Text>
				<CopyText text={data.referenceHandle} />
			</Flex>

			<Flex direction="column" gap="2">
				<Text>Description</Text>
				<TextArea
					size="2"
					variant="surface"
					resize="vertical"
					value={data.actionDescription}
					style={{ height: "150px" }}
					onChange={(event) => {
						const clonedData = cloneDeep(data);
						clonedData.actionDescription = event.target.value;
						updateData(clonedData);
					}}
				/>
			</Flex>

			{/* TODO: credentials drop-down */}

			<Text weight="medium">API Parameters</Text>

			{apiDefinition.parameters.map((parameter) => (
				<Flex direction="column" gap="2" key={parameter.id}>
					<Text>
						{parameter.displayName}
						{parameter.required ? "" : " (Optional)"}
					</Text>
					<TextField.Root
						variant="surface"
						value={
							(data.actionDefinition as any).params[parameter.id]
						}
						onChange={(event) => {
							const clonedData = cloneDeep(data);
							(clonedData.actionDefinition as any).params[
								parameter.id
							] = event.target.value;
							updateData(clonedData);
						}}
					/>
				</Flex>
			))}
		</Flex>
	);
}
