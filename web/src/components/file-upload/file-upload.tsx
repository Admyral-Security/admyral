"use client";

import { useImportWorkflow } from "@/hooks/use-import-workflow";
import { UploadIcon } from "@radix-ui/react-icons";
import { Flex, Text } from "@radix-ui/themes";
import { useCallback, useState } from "react";

interface FileUploadProps {
	fileType: string;
}

export default function FileUpload({ fileType }: FileUploadProps) {
	const { importWorkflow, errorMessage } = useImportWorkflow();
	const [isDragging, setIsDragging] = useState(false);

	const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		setIsDragging(true);
	}, []);

	const onDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		setIsDragging(true);
	}, []);

	const onDrop = useCallback(
		(e: React.DragEvent<HTMLDivElement>) => {
			e.preventDefault();
			setIsDragging(false);

			const files = e.dataTransfer.files;
			if (files.length > 0) {
				const file = files[0];
				importWorkflow(file);
			}
		},
		[importWorkflow],
	);

	const handleFileInput = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			e.preventDefault();
			const files = e.target.files;
			if (files && files.length > 0) {
				const file = files[0];
				importWorkflow(file);
			}
		},
		[importWorkflow],
	);

	return (
		<Flex direction="column" gap="4">
			<Flex
				onDragOver={onDragOver}
				onDragLeave={onDragLeave}
				onDrop={onDrop}
				className={`relative border-2 border-dashed rounded-lg p-8 text-center 
				${isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400"}
				transition-colors duration-200 ease-in-out`}
				direction="column"
			>
				<input
					type="file"
					onChange={handleFileInput}
					className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
				/>

				<Flex direction="column" gap="4">
					<Flex justify="center" width="100%">
						<UploadIcon color="gray" height={32} width={32} />
					</Flex>
					<Text>
						<Text color="blue">Click to upload</Text> or drag and
						drop {fileType}
					</Text>
				</Flex>
			</Flex>
			{errorMessage && <Text color="red">{errorMessage}</Text>}
		</Flex>
	);
}
