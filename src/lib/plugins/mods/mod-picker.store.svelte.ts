/** One row of the mod action picker */
export interface ModPickerAction {
	/** Action id, unique within its mod */
	id: string;
	/** Row title */
	title: string;
	/** Row subtitle */
	description?: string;
	/** Runs the action; the host's wrapper, which reports a failure itself and never rejects */
	run: () => Promise<void>;
}

interface OpenPicker {
	modId: string;
	title: string;
	actions: ModPickerAction[];
}

/** The open picker, or null while it is closed */
let current = $state.raw<OpenPicker | null>(null);

/** Reactive store for the picker a mod's rail button opens */
export const modPickerStore = {
	/** Whether the picker is open */
	get isOpen() {
		return current !== null;
	},
	/** Id of the mod whose actions are shown; null while closed */
	get modId() {
		return current?.modId ?? null;
	},
	/** The clicked button's title; empty while closed */
	get title() {
		return current?.title ?? '';
	},
	/** The rows, in the button's order; empty while closed */
	get actions() {
		return current?.actions ?? [];
	},

	/** Opens the picker on a mod's actions, replacing one already open */
	open(modId: string, title: string, actions: ModPickerAction[]) {
		current = { modId, title, actions };
	},

	/** Closes the picker */
	close() {
		current = null;
	},

	/** Closes the picker if it shows the actions of `modId` (the mod unloaded) */
	closeForMod(modId: string) {
		if (current?.modId === modId) current = null;
	},

	/** Closes the picker (tests) */
	reset() {
		current = null;
	},
};
