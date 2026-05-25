/**
 * Reactive store tracking archived note paths.
 * Rebuilt when vault index updates (vaultIndexVersion pattern).
 */

let archivedPaths = $state<Set<string>>(new Set());
let archivedCount = $state(0);

export const lifecycleFilterStore = {
	get archivedPaths() { return archivedPaths; },
	get archivedCount() { return archivedCount; },

	/** Returns true if the given path is archived. */
	isArchived(path: string): boolean {
		return archivedPaths.has(path);
	},

	/** Updates the archived path set from vault entries. */
	setArchivedPaths(paths: Set<string>): void {
		archivedPaths = paths;
		archivedCount = paths.size;
	},

	reset(): void {
		archivedPaths = new Set();
		archivedCount = 0;
	},
};
