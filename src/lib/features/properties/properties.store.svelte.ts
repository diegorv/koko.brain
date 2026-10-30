import type { Property } from './properties.types';

/** The current note's parsed frontmatter properties */
let properties = $state<Property[]>([]);

/**
 * Absolute path of the note `properties` belong to, or null when they belong
 * to no note. Commits compare it to the active tab so one note's properties
 * are never written into another note.
 */
let sourcePath = $state<string | null>(null);

/**
 * Reactive store for the Properties View feature.
 * Holds the parsed frontmatter properties of the currently active note.
 */
export const propertiesStore = {
	get properties() { return properties; },

	/** Path of the note the properties belong to (null when none) */
	get sourcePath() { return sourcePath; },

	/** Replaces the entire properties list and records the note it belongs to */
	setProperties(p: Property[], path: string | null) {
		properties = p;
		sourcePath = path;
	},

	/** Resets all state to initial values */
	reset() {
		properties = [];
		sourcePath = null;
	},
};
