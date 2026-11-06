/** One row of the mod action picker */
export interface ModPickerAction {
	/** Action id, unique within its mod */
	id: string;
	/** Row title */
	title: string;
	/** Row subtitle */
	description?: string;
	/** Set when the action asks for one line of text before it runs (PRD P8) */
	input?: { placeholder?: string };
	/** Runs the action with the typed text (`''` without `input`); the host's wrapper, which shows the run view, reports a failure itself and never rejects */
	run: (input: string) => Promise<void>;
}

interface OpenPicker {
	modId: string;
	title: string;
	actions: ModPickerAction[];
	/** The action whose text field is shown, or null on the action list */
	inputAction: ModPickerAction | null;
	/** Rail button key whose run the picker shows (its run view); null otherwise */
	runKey: string | null;
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
	/** The action whose text field the picker shows (its second step); null on the action list or while closed */
	get inputAction() {
		return current?.inputAction ?? null;
	},
	/** Rail button key (`mod:<mod>:<button>`) whose run the picker shows; null otherwise or while closed */
	get runKey() {
		return current?.runKey ?? null;
	},

	/** Opens the picker on a mod's actions, replacing one already open */
	open(modId: string, title: string, actions: ModPickerAction[]) {
		current = { modId, title, actions, inputAction: null, runKey: null };
	},

	/** Shows the text field of `action`; does nothing while closed */
	askInput(action: ModPickerAction) {
		if (current) current = { ...current, inputAction: action };
	},

	/** Shows the run view of a rail button's run, opening the picker if it is closed */
	showRun(modId: string, runKey: string) {
		current = { modId, title: current?.title ?? '', actions: current?.actions ?? [], inputAction: null, runKey };
	},

	/** Closes the picker */
	close() {
		current = null;
	},

	/**
	 * Closes the picker if it shows the actions of `modId` (the mod unloaded).
	 * A run view stays open: it shows how the run ended.
	 */
	closeForMod(modId: string) {
		if (current?.modId === modId && current.runKey === null) current = null;
	},

	/** Closes the picker (tests) */
	reset() {
		current = null;
	},
};
