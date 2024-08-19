import { Button } from "@radix-ui/themes";
import SettingsIcon from "../icons/settings-icon";
import { useWorkflowStore } from "@/stores/workflow-store";

export default function WorkflowSettingsButton() {
	const { clickWorkflowSettings } = useWorkflowStore();
	return (
		<Button
			onClick={clickWorkflowSettings}
			variant="soft"
			size="2"
			style={{
				cursor: "pointer",
				color: "var(--Neutral-color-Neutral-11, #60646C)",
				backgroundColor:
					"var(--Neutral-color-Neutral-Alpha-3, rgba(0, 0, 59, 0.05))",
			}}
		>
			<SettingsIcon color="#60646C" />
			Settings
		</Button>
	);
}
