"use client";

import { TSecret } from "@/types/secrets";
import { MinusIcon, PlusIcon } from "@radix-ui/react-icons";
import { Flex, IconButton, Text, TextField } from "@radix-ui/themes";
import FloppyDiskIcon from "../icons/floppy-disk-icon";
import { useSecretsStore } from "@/stores/secrets-store";
import { useSetSecretApi } from "@/hooks/use-set-secret-api";
import { ChangeEvent, useEffect } from "react";
import { produce } from "immer";
import { useToast } from "@/providers/toast";

export default function NewSecret({ idx }: { idx: number }) {
	const { errorToast } = useToast();
	const { secrets, updateSecret } = useSecretsStore();
	const saveSecret = useSetSecretApi();

	const secret = secrets[idx] as TSecret;

	useEffect(() => {
		if (saveSecret.isSuccess) {
			updateSecret(idx, {
				secretId: secret.secretId,
				secretSchema: secret.secret.map(
					(keyValuePair) => keyValuePair.key,
				),
			});
		}
		if (saveSecret.isError) {
			errorToast(
				`Failed to save secret ${secret.secretId}. Please try again.`,
			);
		}
		if (saveSecret.isSuccess || saveSecret.isError) {
			saveSecret.reset();
		}
	}, [saveSecret, updateSecret, secret.secret, secret.secretId, idx]);

	const handleUpdateSecretName = (event: ChangeEvent<HTMLInputElement>) =>
		updateSecret(
			idx,
			produce(secret, (draft) => {
				draft.secretId = event.target.value;
			}),
		);

	const handleSave = () => saveSecret.mutate({ secret });

	const handleKeyUpdate = (
		event: ChangeEvent<HTMLInputElement>,
		keyValuePairIdx: number,
	) =>
		updateSecret(
			idx,
			produce(secret, (draft) => {
				draft.secret[keyValuePairIdx].key = event.target.value;
			}),
		);

	const handleValueUpdate = (
		event: ChangeEvent<HTMLInputElement>,
		keyValuePairIdx: number,
	) =>
		updateSecret(
			idx,
			produce(secret, (draft) => {
				draft.secret[keyValuePairIdx].value = event.target.value;
			}),
		);

	const removeKeyValuePair = (keyValuePairIdx: number) =>
		updateSecret(
			idx,
			produce(secret, (draft) => {
				draft.secret.splice(keyValuePairIdx, 1);
			}),
		);

	const addKeyValuePair = () =>
		updateSecret(
			idx,
			produce(secret, (draft) => {
				draft.secret.push({
					key: "",
					value: "",
				});
			}),
		);

	return (
		<Flex direction="column" gap="1">
			<Flex width="100%" gap="2" align="end">
				<Flex direction="column" gap="1" width="100%">
					<Text>Secret Name</Text>
					<TextField.Root
						onChange={handleUpdateSecretName}
						value={secret.secretId}
					/>
				</Flex>

				<Flex>
					<IconButton
						variant="soft"
						color="blue"
						style={{ cursor: "pointer" }}
						onClick={handleSave}
					>
						<FloppyDiskIcon />
					</IconButton>
				</Flex>
			</Flex>

			{secret.secret.map((keyValuePair, keyValuePairIdx) => (
				<Flex
					key={`new_secret_${secret.secretId}_${keyValuePairIdx}`}
					width="100%"
					gap="4"
				>
					<Flex justify="between" gap="1" width="100%">
						<Flex direction="column" gap="1" width="100%">
							<Text>Key</Text>
							<TextField.Root
								value={keyValuePair.key}
								onChange={(event) =>
									handleKeyUpdate(event, keyValuePairIdx)
								}
							/>
						</Flex>

						<Flex direction="column" gap="1" width="100%">
							<Text>Value</Text>
							<TextField.Root
								value={keyValuePair.value}
								onChange={(event) =>
									handleValueUpdate(event, keyValuePairIdx)
								}
							/>
						</Flex>
					</Flex>

					<Flex align="end">
						<IconButton
							radius="full"
							color="red"
							size="1"
							style={{
								cursor: "pointer",
							}}
							onClick={() => removeKeyValuePair(keyValuePairIdx)}
						>
							<MinusIcon />
						</IconButton>
					</Flex>
				</Flex>
			))}

			<Flex width="100%" justify="center" align="center">
				<IconButton
					radius="full"
					size="1"
					style={{ cursor: "pointer" }}
					onClick={addKeyValuePair}
				>
					<PlusIcon />
				</IconButton>
			</Flex>
		</Flex>
	);
}
