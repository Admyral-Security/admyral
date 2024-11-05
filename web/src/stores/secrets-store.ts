import { TSecretMetadata } from "@/types/secrets";
import { create } from "zustand";
import { produce } from "immer";

type SecretsStore = {
	secrets: TSecretMetadata[];
	clearSecretsStore: () => void;
	setSecrets: (secrets: TSecretMetadata[]) => void;
	getSecret: (idx: number) => TSecretMetadata;
	addNewSecret: (newSecret: TSecretMetadata) => void;
	updateSecret: (idx: number, update: TSecretMetadata) => void;
	removeSecret: (idx: number) => void;
	isDuplicateSecret: (secretId: string) => boolean;
};

export const useSecretsStore = create<SecretsStore>((set, get) => ({
	secrets: [],
	clearSecretsStore: () =>
		set({
			secrets: [],
		}),
	setSecrets: (secrets) =>
		set({
			secrets,
		}),
	getSecret: (idx: number) => get().secrets[idx],
	addNewSecret: (newSecret: TSecretMetadata) =>
		set(
			produce((draft) => {
				draft.secrets.unshift(newSecret);
			}),
		),
	updateSecret: (idx: number, update: TSecretMetadata) =>
		set(
			produce((draft) => {
				draft.secrets[idx] = update;
			}),
		),
	removeSecret: (idx: number) =>
		set(
			produce((draft) => {
				draft.secrets.splice(idx, 1);
			}),
		),
	isDuplicateSecret: (secretId: string) =>
		get().secrets.findIndex((secret) => secret.secretId === secretId) !==
		-1,
}));
