"use client";

import { deleteAccount } from "@/lib/api";
import { AlertDialog, Button, Flex } from "@radix-ui/themes";
import { useState } from "react";

export default function DeleteAccountButton() {
	const [isDeleting, setIsDeleting] = useState<boolean>(false);

	const handleDelete = async () => {
		setIsDeleting(true);
		try {
			await deleteAccount();
		} catch (err) {
			console.error(err);
			alert(
				`Failed to delete account! Please try again. If the problem persists, please contact us on Discord or via email at ${process.env.NEXT_PUBLIC_SUPPORT_EMAIL}`,
			);
		} finally {
			setIsDeleting(false);
		}
	};

	return (
		<AlertDialog.Root>
			<AlertDialog.Trigger>
				<Button
					loading={isDeleting}
					variant="outline"
					color="red"
					style={{ cursor: "pointer" }}
				>
					Delete account
				</Button>
			</AlertDialog.Trigger>

			<AlertDialog.Content maxWidth="450px">
				<AlertDialog.Title>Delete account</AlertDialog.Title>
				<AlertDialog.Description size="2">
					Are you sure? This application will no longer be accessible
					and all data will be deleted.
				</AlertDialog.Description>

				<Flex gap="3" mt="4" justify="end">
					<AlertDialog.Cancel>
						<Button
							variant="soft"
							color="gray"
							style={{ cursor: "pointer" }}
						>
							Cancel
						</Button>
					</AlertDialog.Cancel>
					<AlertDialog.Action>
						<Button
							loading={isDeleting}
							variant="solid"
							color="red"
							style={{ cursor: "pointer" }}
							onClick={handleDelete}
						>
							Delete account
						</Button>
					</AlertDialog.Action>
				</Flex>
			</AlertDialog.Content>
		</AlertDialog.Root>
	);
}
