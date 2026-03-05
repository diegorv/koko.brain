const STORAGE_KEY = 'kokobrain:recent-commands';
const MAX_RECENT = 20;

let isOpen = $state(false);
let recentCommandIds = $state<string[]>(loadRecentCommandIds());

function loadRecentCommandIds(): string[] {
	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		return stored ? JSON.parse(stored) : [];
	} catch {
		return [];
	}
}

function persistRecentCommandIds(ids: string[]) {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
	} catch {
		// localStorage may be unavailable
	}
}

export const commandPaletteStore = {
	get isOpen() {
		return isOpen;
	},
	get recentCommandIds() {
		return recentCommandIds;
	},

	open() {
		isOpen = true;
	},
	close() {
		isOpen = false;
	},
	toggle() {
		isOpen = !isOpen;
	},

	addRecentCommand(id: string) {
		const filtered = recentCommandIds.filter((c) => c !== id);
		recentCommandIds = [id, ...filtered].slice(0, MAX_RECENT);
		persistRecentCommandIds(recentCommandIds);
	},

	reset() {
		isOpen = false;
		recentCommandIds = [];
		try {
			localStorage.removeItem(STORAGE_KEY);
		} catch {
			// ignore
		}
	},
};
