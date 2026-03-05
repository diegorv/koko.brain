import type { PersonEntry } from './one-on-one.logic';

let isOpen = $state(false);
let people = $state<PersonEntry[]>([]);

/** Reactive store for the 1:1 note person picker */
export const oneOnOneStore = {
	get isOpen() { return isOpen; },
	get people() { return people; },

	/** Opens the person picker dialog */
	open() { isOpen = true; },
	/** Closes the person picker dialog */
	close() { isOpen = false; },
	/** Toggles the person picker dialog */
	toggle() { isOpen = !isOpen; },

	/** Replaces the people list */
	setPeople(value: PersonEntry[]) { people = value; },

	/** Resets all state (e.g. when switching vaults) */
	reset() {
		isOpen = false;
		people = [];
	},
};
