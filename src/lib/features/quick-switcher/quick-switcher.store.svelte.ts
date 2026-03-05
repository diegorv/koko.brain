const STORAGE_KEY = 'kokobrain:recent-files';
const MAX_RECENT = 20;

let isOpen = $state(false);
let recentPaths = $state<string[]>(loadRecentPaths());

function loadRecentPaths(): string[] {
	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		return stored ? JSON.parse(stored) : [];
	} catch {
		return [];
	}
}

function persistRecentPaths(paths: string[]) {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(paths));
	} catch {
		// localStorage may be unavailable
	}
}

export const quickSwitcherStore = {
	get isOpen() { return isOpen; },
	get recentPaths() { return recentPaths; },

	open() { isOpen = true; },
	close() { isOpen = false; },
	toggle() { isOpen = !isOpen; },

	addRecentPath(path: string) {
		const filtered = recentPaths.filter((p) => p !== path);
		recentPaths = [path, ...filtered].slice(0, MAX_RECENT);
		persistRecentPaths(recentPaths);
	},

	/** Removes a path from the recent list (e.g. after file deletion) */
	removeRecentPath(path: string) {
		const filtered = recentPaths.filter((p) => p !== path && !p.startsWith(path + '/'));
		if (filtered.length !== recentPaths.length) {
			recentPaths = filtered;
			persistRecentPaths(recentPaths);
		}
	},

	reset() {
		isOpen = false;
		recentPaths = [];
		try {
			localStorage.removeItem(STORAGE_KEY);
		} catch {
			// ignore
		}
	},
};
