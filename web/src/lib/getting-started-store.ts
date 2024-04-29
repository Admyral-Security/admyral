import { create } from "zustand";

type GettingStartedState = {
	showGettingStarted: boolean;
	setShowGettingStarted: (showGettingStarted: boolean) => void;
};

const useGettingStartedStore = create<GettingStartedState>((set) => ({
	showGettingStarted: false,
	setShowGettingStarted: (showGettingStarted: boolean) => {
		set({ showGettingStarted });
	},
}));

export default useGettingStartedStore;
