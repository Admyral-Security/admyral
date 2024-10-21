"use client";

import React, { createContext, useContext, useState } from "react";
import * as Toast from "@radix-ui/react-toast";
import {
	InfoCircledIcon,
	ExclamationTriangleIcon,
	CheckCircledIcon,
} from "@radix-ui/react-icons";
import { Flex } from "@radix-ui/themes";

type ToastType = "success" | "error" | "info";

interface ToastContextType {
	successToast: (message: string) => void;
	errorToast: (message: string) => void;
	infoToast: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const ToastIcon = ({ type }: { type: ToastType }) => {
	switch (type) {
		case "info":
			return <InfoCircledIcon className="ToastIcon" />;
		case "error":
			return <ExclamationTriangleIcon className="ToastIcon" />;
		case "success":
			return <CheckCircledIcon className="ToastIcon" />;
	}
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
	const [open, setOpen] = useState(false);
	const [message, setMessage] = useState("");
	const [type, setType] = useState<ToastType>("info");

	const showToast = (newMessage: string, newType: ToastType) => {
		setMessage(newMessage);
		setType(newType);
		setOpen(true);
	};

	return (
		<ToastContext.Provider
			value={{
				successToast: (message: string) =>
					showToast(message, "success"),
				errorToast: (message: string) => showToast(message, "error"),
				infoToast: (message: string) => showToast(message, "info"),
			}}
		>
			{children}
			<Toast.Provider swipeDirection="right">
				<Toast.Root
					className={`ToastRoot ${type}`}
					open={open}
					onOpenChange={setOpen}
				>
					<Flex className="ToastContent" align="center">
						<ToastIcon type={type} />
						<Flex direction="column">
							<Toast.Title className="ToastTitle">
								{type.charAt(0).toUpperCase() + type.slice(1)}
							</Toast.Title>
							<Toast.Description className="ToastDescription">
								{message}
							</Toast.Description>
						</Flex>
					</Flex>
				</Toast.Root>
				<Toast.Viewport className="ToastViewport" />
			</Toast.Provider>
		</ToastContext.Provider>
	);
}

export function useToast() {
	const context = useContext(ToastContext);
	if (context === undefined) {
		throw new Error("useToast must be used within a ToastProvider");
	}
	return context;
}
