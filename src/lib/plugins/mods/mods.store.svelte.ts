/** Load state of one folder under `_system/mods/`, shown in Settings > Labs */
export interface ModStatusEntry {
	/** Manifest id; the folder name when the manifest could not be read */
	id: string;
	/** Folder name under `_system/mods/` */
	folder: string;
	/** Manifest name; the folder name when the manifest could not be read */
	name: string;
	/** Manifest version; empty when the manifest could not be read */
	version: string;
	/** Whether `onload` completed or the mod failed to load */
	state: 'loaded' | 'error';
	/** Set when `state` is `'error'`; the message starts with `_system/mods/<folder>: ` */
	error?: { message: string; stack?: string };
}

/** One entry per mod folder, sorted by folder */
let entries = $state.raw<ModStatusEntry[]>([]);

function byFolder(a: ModStatusEntry, b: ModStatusEntry): number {
	return a.folder < b.folder ? -1 : a.folder > b.folder ? 1 : 0;
}

/** Reactive store for the status of the vault's mods */
export const modsStore = {
	/** Every mod folder's load state, sorted by folder */
	get entries() {
		return entries;
	},

	/** Replaces the whole list */
	setEntries(next: ModStatusEntry[]) {
		entries = [...next].sort(byFolder);
	},

	/** Adds the entry, or replaces the one with the same folder */
	upsertEntry(entry: ModStatusEntry) {
		entries = [...entries.filter((e) => e.folder !== entry.folder), entry].sort(byFolder);
	},

	/** Empties the list */
	reset() {
		entries = [];
	},
};
