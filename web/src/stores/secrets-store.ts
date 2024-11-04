import { TSecretMetadata } from "@/types/secrets";
import { create } from "zustand";
import { produce } from "immer";

type SecretsStore = {
	secrets: TSecretMetadata[];
	clear: () => void;
	setSecrets: (secrets: TSecretMetadata[]) => void;
	getSecret: (idx: number) => TSecretMetadata;
	getNumberOfSecrets: () => number;
	addNewSecret: () => void;
	updateSecret: (idx: number, update: TSecretMetadata) => void;
	removeSecret: (idx: number) => void;
};

export const useSecretsStore = create<SecretsStore>((set, get) => ({
	secrets: [],
	clear: () =>
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
}));
