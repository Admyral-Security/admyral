import { useToast } from "@/providers/toast";

export function useToastFunctions() {
	const { showToast } = useToast();

	const successToast = (message: string) => showToast(message, "success");
	const errorToast = (message: string) => showToast(message, "error");
	const infoToast = (message: string) => showToast(message, "info");

	return { successToast, errorToast, infoToast };
}
