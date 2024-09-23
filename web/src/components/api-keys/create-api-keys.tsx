"use client";

import { useCreateApiKey } from "@/hooks/use-create-api-key";
import { errorToast } from "@/lib/toast";
import { useApiKeysStore } from "@/stores/api-keys-store";
import { InfoCircledIcon, PlusIcon } from "@radix-ui/react-icons";
import {
	Button,
	Callout,
	Dialog,
	Flex,
	Text,
	TextField,
} from "@radix-ui/themes";
import { useEffect, useState } from "react";
import CopyText from "../utils/copy-text";

enum State {
	CLOSED,
	ENTER_NAME,
	SHOW_KEY,
}

export default function CreateApiKey() {
	const [state, setState] = useState<State>(State.CLOSED);
	const [name, setName] = useState<string | undefined>(undefined);
	const [secretKey, setSecretKey] = useState<string>("");

	const createApiKey = useCreateApiKey();
	const { addApiKey } = useApiKeysStore();
	const handleCreateApiKey = () => createApiKey.mutate({ name: name! });

	useEffect(() => {
		if (createApiKey.isSuccess) {
			addApiKey({
				id: createApiKey.data.key.id,
				name: createApiKey.data.key.name,
			});
			setSecretKey(createApiKey.data.secret);
			setState(State.SHOW_KEY);
			createApiKey.reset();
			return () => setSecretKey("");
		}
		if (createApiKey.isError) {
			errorToast(`Failed to create API key. Please try again.`);
			createApiKey.reset();
		}
	}, [createApiKey, setSecretKey, setState, addApiKey]);

	return (
		<Dialog.Root
			onOpenChange={(wasOpened) => {
				if (!wasOpened) {
					setState(State.CLOSED);
				}
			}}
			open={state !== State.CLOSED}
		>
			<Dialog.Trigger>
				<Button
					style={{
						cursor: "pointer",
					}}
					onClick={() => setState(State.ENTER_NAME)}
				>
					Create API Key
					<PlusIcon />
				</Button>
			</Dialog.Trigger>

			<Dialog.Content maxWidth="540px">
				<Dialog.Title>Create API Key</Dialog.Title>

				{state === State.ENTER_NAME && (
					<>
						<Flex direction="column" gap="3">
							<label>
								<Text as="div" size="2" mb="1" weight="bold">
									Name
								</Text>
								<TextField.Root
									value={name}
									onChange={(event) =>
										setName(event.target.value)
									}
									placeholder="Your API Key Name"
								/>
							</label>
						</Flex>

						<Flex gap="3" mt="4" justify="end">
							<Dialog.Close>
								<Button variant="soft" color="gray">
									Cancel
								</Button>
							</Dialog.Close>
							<Button
								disabled={!name || name.length === 0}
								onClick={handleCreateApiKey}
							>
								Save
							</Button>
						</Flex>
					</>
				)}

				{state === State.SHOW_KEY && (
					<Flex direction="column">
						<Callout.Root color="blue">
							<Flex align="center" gap="5">
								<Callout.Icon>
									<InfoCircledIcon width="20" height="20" />
								</Callout.Icon>
								<Callout.Text size="2">
									Make sure to copy your personal access token
									now. You won’t be able to see it again!
								</Callout.Text>
							</Flex>
						</Callout.Root>

						<CopyText text={secretKey} />

						<Flex gap="3" mt="4" justify="end">
							<Dialog.Close>
								<Button>Close</Button>
							</Dialog.Close>
						</Flex>
					</Flex>
				)}
			</Dialog.Content>
		</Dialog.Root>
	);
}
