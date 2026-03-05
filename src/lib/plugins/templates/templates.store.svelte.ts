import type { TemplateEntry } from './templates.logic';

/** Whether the template picker dialog is open */
let isOpen = $state(false);
/** Available templates loaded from the _templates/ folder */
let templates = $state<TemplateEntry[]>([]);

/** Reactive store for the templates plugin */
export const templatesStore = {
	get isOpen() { return isOpen; },
	get templates() { return templates; },

	/** Opens the template picker dialog */
	open() { isOpen = true; },
	/** Closes the template picker dialog */
	close() { isOpen = false; },
	/** Toggles the template picker dialog */
	toggle() { isOpen = !isOpen; },

	/** Replaces the full list of available templates */
	setTemplates(value: TemplateEntry[]) { templates = value; },

	/** Resets all state (e.g. when switching vaults) */
	reset() {
		isOpen = false;
		templates = [];
	},
};
