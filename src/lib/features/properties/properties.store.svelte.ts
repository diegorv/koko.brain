import type { Property } from './properties.types';

/** The current note's parsed frontmatter properties */
let properties = $state<Property[]>([]);

/**
 * Reactive store for the Properties View feature.
 * Holds the parsed frontmatter properties of the currently active note.
 */
export const propertiesStore = {
	get properties() { return properties; },

	/** Replaces the entire properties list (e.g. when switching notes) */
	setProperties(p: Property[]) { properties = p; },

	/** Resets all state to initial values */
	reset() {
		properties = [];
	},
};
