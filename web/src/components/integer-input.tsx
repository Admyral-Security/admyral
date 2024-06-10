import { TextField } from "@radix-ui/themes";
import { useEffect, useState } from "react";

interface IntegerInputProps {
	value?: number;
	onValueChange: (value: number | undefined) => void;
	min?: number;
	max?: number;
}

export default function IntegerInput({
	value,
	onValueChange,
	min,
	max,
}: IntegerInputProps) {
	const [inputValue, setInputValue] = useState<string>(
		value !== undefined ? value.toString() : "",
	);

	useEffect(() => {
		setInputValue(value !== undefined ? value.toString() : "");
	}, [value]);

	const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		if (event.target.value === "") {
			setInputValue("");
			onValueChange(undefined);
			return;
		}
		const regexMatch = /^[0-9]*$/g.test(event.target.value);
		if (!regexMatch) {
			return;
		}
		const newValue = parseInt(event.target.value);
		if (!isNaN(newValue)) {
			if (
				(min === undefined || newValue >= min) &&
				(max === undefined || newValue <= max)
			) {
				setInputValue(event.target.value);
				onValueChange(newValue);
			}
		} else {
			// If we get NaN, reset everything
			setInputValue("");
			onValueChange(undefined);
		}
	};

	return (
		<TextField.Root
			variant="surface"
			value={inputValue}
			type="text"
			onChange={handleChange}
		/>
	);
}
