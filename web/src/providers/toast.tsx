"use client";

import React, { createContext, useContext, useState } from "react";
import * as Toast from "@radix-ui/react-toast";
import {
	InfoCircledIcon,
	ExclamationTriangleIcon,
	CheckCircledIcon,
} from "@radix-ui/react-icons";

type ToastType = "success" | "error" | "info";

interface ToastContextType {
	showToast: (message: string, type: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
	const context = useContext(ToastContext);
	if (context === undefined) {
		throw new Error("useToast must be used within a ToastProvider");
	}
	return context;
}

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
		<ToastContext.Provider value={{ showToast }}>
			{children}
			<Toast.Provider swipeDirection="right">
				<Toast.Root
					className={`ToastRoot ${type}`}
					open={open}
					onOpenChange={setOpen}
				>
					<div className="ToastContent">
						<ToastIcon type={type} />
						<div>
							<Toast.Title className="ToastTitle">
								<strong>
									{type.charAt(0).toUpperCase() +
										type.slice(1)}
								</strong>
							</Toast.Title>
							<Toast.Description className="ToastDescription">
								{message}
							</Toast.Description>
						</div>
					</div>
				</Toast.Root>
				<Toast.Viewport className="ToastViewport" />
			</Toast.Provider>
		</ToastContext.Provider>
	);
}
