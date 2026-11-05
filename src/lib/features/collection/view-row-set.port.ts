import type { CollectionDefinition, CollectionViewDef, PropertyIndexRecord } from './collection.types';

/**
 * The rail's rule for the rows of a `.view`, which the collection editor
 * follows so its "N results" match the rail's list and the navigator count.
 * The rule lives on the rail side (`viewRowSet` in `rail-shell/lens.logic.ts`)
 * and collection may not import rail-shell (the feature-cycle ratchet), so
 * the app fills this slot from `registerAppPorts()`. Both methods read the
 * stores at call time, so a call inside a reactive context tracks them.
 */
export interface ViewRowSetPort {
	/**
	 * The rows the `.view` at `viewPath` lists from the records its `view`
	 * matched (filters and the view's own sort applied, `limit` not yet), in
	 * display order, `limit` applied. `definition` is the one the query ran,
	 * whose filters, with the view's, decide whether archived notes stay
	 */
	rows(
		viewPath: string,
		records: PropertyIndexRecord[],
		view: CollectionViewDef,
		definition: CollectionDefinition,
	): PropertyIndexRecord[];
	/**
	 * Whether this vault's entries, which `rows` reads, have landed. `rows` drops
	 * a record with no entry, so until then every view would report no rows. True
	 * for a vault with no notes.
	 */
	entriesLoaded(): boolean;
	/** The Sort panel's text for the `.view` when no sort of the view's own orders the list */
	sortLabel(viewPath: string): string;
}

/** The installed port; null until the app registers one. */
let viewRowSetPort: ViewRowSetPort | null = null;

/**
 * Installs the port a `.view` in the collection editor uses. Returns a
 * function that removes it again (only if it is still the installed one).
 */
export function registerViewRowSetPort(port: ViewRowSetPort): () => void {
	viewRowSetPort = port;
	return () => {
		if (viewRowSetPort === port) viewRowSetPort = null;
	};
}

/** The installed port, or null when none is registered (the editor then runs the plain query). */
export function getViewRowSetPort(): ViewRowSetPort | null {
	return viewRowSetPort;
}
