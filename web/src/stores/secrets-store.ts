import { isSecretMetadata, TSecret, TSecretMetadata } from "@/types/secrets";
import { create } from "zustand";
import { produce } from "immer";

type SecretsStore = {
	secrets: (TSecret | TSecretMetadata)[];
	clearSecretsStore: () => void;
	setSecrets: (secrets: (TSecret | TSecretMetadata)[]) => void;
	getSecret: (idx: number) => TSecret | TSecretMetadata;
	getNumberOfSecrets: () => number;
	addNewSecret: () => void;
	updateSecret: (idx: number, update: TSecret | TSecretMetadata) => void;
	removeSecret: (idx: number) => void;
	isNewSecret: (idx: number) => boolean;
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
	getNumberOfSecrets: () => get().secrets.length,
	addNewSecret: () =>
		set(
			produce((draft) => {
				draft.secrets.unshift({
					secretId: "",
					secret: [{ key: "", value: "" }],
				});
			}),
		),
	updateSecret: (idx: number, update: TSecret | TSecretMetadata) =>
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
	isNewSecret: (idx: number) => !isSecretMetadata(get().secrets[idx]),
}));
