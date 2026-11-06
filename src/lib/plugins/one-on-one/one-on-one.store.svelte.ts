import type { PersonEntry } from './one-on-one.logic';

/** Replaces the picker's default action for one opening; a rejection is shown as a toast */
export type OneOnOneSelectHandler = (person: PersonEntry) => void | Promise<void>;

let isOpen = $state(false);
let people = $state<PersonEntry[]>([]);
/** What picking a person does instead of creating the 1:1 note; null for the note */
let selectHandler: OneOnOneSelectHandler | null = null;

/** Reactive store for the 1:1 note person picker */
export const oneOnOneStore = {
	get isOpen() { return isOpen; },
	get people() { return people; },
	get selectHandler() { return selectHandler; },

	/** Opens the person picker dialog, with `handler` as what picking a person does this time */
	open(handler?: OneOnOneSelectHandler) {
		selectHandler = handler ?? null;
		isOpen = true;
	},
	/** Closes the person picker dialog */
	close() {
		selectHandler = null;
		isOpen = false;
	},
	/** Toggles the person picker dialog */
	toggle() {
		selectHandler = null;
		isOpen = !isOpen;
	},

	/** Replaces the people list */
	setPeople(value: PersonEntry[]) { people = value; },

	/** Resets all state (e.g. when switching vaults) */
	reset() {
		selectHandler = null;
		isOpen = false;
		people = [];
	},
};
