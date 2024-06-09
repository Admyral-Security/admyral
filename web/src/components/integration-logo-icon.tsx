import { INTEGRATIONS, IntegrationType } from "@/lib/integrations";
import Image from "next/image";
import IntegrationIcon from "./icons/integration-icon";
import { LLMS } from "@/lib/llm";

export interface IntegrationLogoIconProps {
	integration: IntegrationType | string | null;
}

export default function IntegrationLogoIcon({
	integration,
}: IntegrationLogoIconProps) {
	if (
		integration !== null &&
		INTEGRATIONS[integration] !== undefined &&
		INTEGRATIONS[integration].icon !== undefined
	) {
		const name = INTEGRATIONS[integration].name;
		const { src, isSquareIcon } = INTEGRATIONS[integration].icon!;
		const [height, width] = isSquareIcon ? [20, 20] : [20, 40];

		return <Image src={src} alt={name} height={height} width={width} />;
	}

	if (
		integration !== null &&
		LLMS[integration] !== undefined &&
		LLMS[integration].icon !== undefined
	) {
		const { icon } = LLMS[integration];
		return <Image src={icon} alt={integration} height={20} width={20} />;
	}

	return <IntegrationIcon />;
}
