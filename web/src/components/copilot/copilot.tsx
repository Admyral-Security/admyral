// "use client";

// import { useCopilotChat } from "@copilotkit/react-core";
// import { Role, TextMessage } from "@copilotkit/runtime-client-gql";
// import { useState } from "react";

// export function CustomChatInterface() {
// 	const {
// 		visibleMessages,
// 		appendMessage,
// 		setMessages,
// 		deleteMessage,
// 		reloadMessages,
// 		stopGeneration,
// 		isLoading,
// 	} = useCopilotChat();

// 	const sendMessage = (content: string) => {
// 		if (content.trim()) {
// 			appendMessage(new TextMessage({ content, role: Role.User }));
// 		}
// 	};

// 	const [inputValue, setInputValue] = useState("");

// 	const handleSubmit = (e: React.FormEvent) => {
// 		e.preventDefault();
// 		sendMessage(inputValue);
// 		setInputValue("");
// 	};

// 	return (
// 		<div className="flex flex-col h-[600px] w-full max-w-2xl mx-auto border rounded-lg">
// 			{/* Messages Container */}
// 			<div className="flex-1 overflow-y-auto p-4 space-y-4">
// 				{visibleMessages.map((message, index) => (
// 					<div
// 						key={index}
// 						className={`p-3 rounded-lg ${
// 							message.role === Role.User
// 								? "bg-blue-100 ml-auto max-w-[80%]"
// 								: "bg-gray-100 mr-auto max-w-[80%]"
// 						}`}
// 					>
// 						{message.content}
// 					</div>
// 				))}
// 				{isLoading && (
// 					<div className="bg-gray-100 rounded-lg p-3 mr-auto max-w-[80%]">
// 						Thinking...
// 					</div>
// 				)}
// 			</div>

// 			{/* Input Form */}
// 			<form onSubmit={handleSubmit} className="border-t p-4">
// 				<div className="flex gap-2">
// 					<input
// 						type="text"
// 						value={inputValue}
// 						onChange={(e) => setInputValue(e.target.value)}
// 						placeholder="Type your message..."
// 						className="flex-1 p-2 border rounded-lg"
// 					/>
// 					<button
// 						type="submit"
// 						disabled={isLoading}
// 						className="px-4 py-2 bg-blue-500 text-white rounded-lg disabled:bg-blue-300"
// 					>
// 						Send
// 					</button>
// 					{isLoading && (
// 						<button
// 							onClick={stopGeneration}
// 							className="px-4 py-2 bg-red-500 text-white rounded-lg"
// 						>
// 							Stop
// 						</button>
// 					)}
// 				</div>
// 			</form>
// 		</div>
// 	);
// }
