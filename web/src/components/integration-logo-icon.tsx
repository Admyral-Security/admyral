import { INTEGRATIONS, IntegrationType } from "@/lib/integrations";
import Image from "next/image";
import IntegrationIcon from "./icons/integration-icon";

export interface IntegrationLogoIconProps {
	integration: IntegrationType | null;
}

export default function IntegrationLogoIcon({
	integration,
}: IntegrationLogoIconProps) {
	if (integration === null || INTEGRATIONS[integration].icon === undefined) {
		return <IntegrationIcon />;
	}

	const name = INTEGRATIONS[integration].name;
	const { src, isSquareIcon } = INTEGRATIONS[integration].icon!;
	const [height, width] = isSquareIcon ? [20, 20] : [20, 40];

	return <Image src={src} alt={name} height={height} width={width} />;
}
