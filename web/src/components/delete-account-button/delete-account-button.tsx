"use client";

import { useDeleteUserApi } from "@/hooks/use-delete-user-api";
import { useToast } from "@/providers/toast";
import { AlertDialog, Button, Flex } from "@radix-ui/themes";
import { signOut } from "next-auth/react";
import { useState } from "react";

export default function DeleteAccountButton() {
	const { errorToast } = useToast();
	const deleteUser = useDeleteUserApi();
	const [isDeleting, setIsDeleting] = useState<boolean>(false);

	const handleDelete = async () => {
		setIsDeleting(true);
		try {
			await deleteUser.mutateAsync();
			await signOut();
		} catch (err) {
			errorToast(
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
