import { toast } from "react-toastify";

export function successToast(message: string) {
	toast(message, {
		theme: "colored",
		type: "success",
	});
}

export function errorToast(message: string) {
	toast(message, {
		theme: "colored",
		type: "error",
	});
}

export function infoToast(message: string) {
	toast(message, {
		theme: "colored",
		type: "info",
	});
}
