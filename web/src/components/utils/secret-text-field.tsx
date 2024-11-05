"use client";

import { EyeClosedIcon, EyeOpenIcon } from "@radix-ui/react-icons";
import { IconButton, TextField } from "@radix-ui/themes";
import { ChangeEventHandler, useState } from "react";

interface SecretTextFieldProps {
	value?: string | number | undefined;
	placeholder?: string | undefined;
	onChange?: ChangeEventHandler<HTMLInputElement> | undefined;
}

export default function SecretTextField({
	value,
	onChange,
	placeholder,
}: SecretTextFieldProps) {
	const [showValue, setShowValue] = useState<boolean>(false);
	return (
		<TextField.Root
			value={value}
			onChange={onChange}
			placeholder={placeholder}
			type={showValue ? "text" : "password"}
		>
			<TextField.Slot side="right">
				<IconButton
					size="1"
					variant="ghost"
					onClick={() => setShowValue((v) => !v)}
					style={{ cursor: "pointer" }}
				>
					{showValue ? <EyeOpenIcon /> : <EyeClosedIcon />}
				</IconButton>
			</TextField.Slot>
		</TextField.Root>
	);
}
