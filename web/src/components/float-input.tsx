"use client";

import { TextField } from "@radix-ui/themes";
import { useEffect, useState } from "react";

interface FloatInputProps {
	value?: number;
	onValueChange: (value: number | undefined) => void;
	min?: number;
	max?: number;
}

// Note: exponeniated numbers, such as 2.5e3, are not handled
export default function FloatInput({
	value,
	onValueChange,
	min,
	max,
}: FloatInputProps) {
	const [numState, setNumState] = useState<string>(
		value ? value.toString() : "",
	);

	useEffect(() => {
		setNumState(value !== undefined ? value.toString() : "");
	}, [value]);

	const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		if (event.target.value === "") {
			setNumState("");
			onValueChange(undefined);
			return;
		}
		const regexMatch = /^[0-9]*\.?[0-9]*$/.test(event.target.value);
		if (!regexMatch) {
			return;
		}
		const newValue = parseFloat(event.target.value);
		if (!isNaN(newValue)) {
			if (
				(min === undefined || newValue >= min) &&
				(max === undefined || newValue <= max)
			) {
				setNumState(event.target.value);
				onValueChange(newValue);
			}
		} else {
			// If we get NaN, reset everything
			onValueChange(undefined);
			setNumState("");
		}
	};

	return (
		<TextField.Root
			variant="surface"
			value={numState}
			type="text"
			onChange={handleChange}
		/>
	);
}
