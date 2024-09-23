import { create } from "zustand";
import { produce } from "immer";
import { TApiKeyMetadata } from "@/types/api-key";

type ApiKeysStore = {
	apiKeys: TApiKeyMetadata[];
	clear: () => void;
	setApiKeys: (keys: TApiKeyMetadata[]) => void;
	addApiKey: (key: TApiKeyMetadata) => void;
	removeApiKey: (id: string) => void;
};

export const useApiKeysStore = create<ApiKeysStore>((set, get) => ({
	apiKeys: [],
	clear: () =>
		set({
			apiKeys: [],
		}),
	setApiKeys: (keys) =>
		produce((draft) => {
			draft.apiKeys = keys;
		}),
	addApiKey: (key) =>
		produce((draft) => {
			draft.apiKeys.push(key);
		}),
	removeApiKey: (id) =>
		produce((draft) => {
			draft.apiKeys = draft.apiKeys.filter(
				(apiKey: TApiKeyMetadata) => apiKey.id !== id,
			);
		}),
}));
