import { INTEGRATIONS, IntegrationType } from "@/lib/integrations";
import { Flex } from "@radix-ui/themes";
import Image from "next/image";

function getIcon(integration?: IntegrationType | null) {
	if (
		integration === null ||
		integration === undefined ||
		INTEGRATIONS[integration].icon === undefined
	) {
		return <Image src="/logo.svg" alt="Admyral" height="32" width="32" />;
	}

	const name = INTEGRATIONS[integration].name;
	const { src, isSquareIcon } = INTEGRATIONS[integration].icon!;
	const [height, width] = isSquareIcon ? [32, 32] : [32, 64];

	return <Image src={src} alt={name} height={height} width={width} />;
}

export default function IntegrationLogoIconCard({
	integration,
}: {
	integration?: IntegrationType | null;
}) {
	return (
		<Flex
			style={{
				borderRadius: "var(--Radius-2, 4px)",
				border: "1px",
				height: "64px",
				width: "64px",
				backgroundColor:
					"var(--Semantic-colors-Warning-Alpha-2, rgba(255, 170, 1, 0.07))",
			}}
		>
			<Flex
				style={{
					width: "100%",
					height: "100%",
				}}
				justify="center"
				align="center"
			>
				{getIcon(integration)}
			</Flex>
		</Flex>
	);
}
