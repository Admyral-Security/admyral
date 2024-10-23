"use client";

import React, { createContext, useContext, useState } from "react";
import * as Toast from "@radix-ui/react-toast";
import {
	InfoCircledIcon,
	ExclamationTriangleIcon,
	CheckCircledIcon,
} from "@radix-ui/react-icons";
import { Flex } from "@radix-ui/themes";

enum ToastType {
	SUCCESS = "Success",
	ERROR = "Error",
	INFO = "Info",
}

interface ToastContextType {
	successToast: (message: string) => void;
	errorToast: (message: string) => void;
	infoToast: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const ToastIcon = ({ type }: { type: ToastType }) => {
	switch (type) {
		case "Info":
			return <InfoCircledIcon className="ToastIcon" />;
		case "Error":
			return <ExclamationTriangleIcon className="ToastIcon" />;
		case "Success":
			return <CheckCircledIcon className="ToastIcon" />;
	}
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
	const [open, setOpen] = useState(false);
	const [message, setMessage] = useState("");
	const [type, setType] = useState<ToastType>(ToastType.INFO);

	const showToast = (newMessage: string, newType: ToastType) => {
		setMessage(newMessage);
		setType(newType);
		setOpen(true);
	};

	return (
		<ToastContext.Provider
			value={{
				successToast: (message: string) =>
					showToast(message, ToastType.SUCCESS),
				errorToast: (message: string) =>
					showToast(message, ToastType.ERROR),
				infoToast: (message: string) =>
					showToast(message, ToastType.INFO),
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
								{type}
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
