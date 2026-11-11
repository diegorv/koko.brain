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
	/** Whether `onload` completed, the mod failed to load, or it is switched off in Labs */
	state: 'loaded' | 'error' | 'disabled';
	/** Set when `state` is `'error'`; the message starts with `_system/mods/<folder>: ` */
	error?: { message: string; stack?: string };
	/**
	 * Set only when `state` is `'loaded'`: wall time in whole milliseconds from
	 * evaluating `main.js` to `onload` settling, without the file reads
	 */
	loadMs?: number;
}

/** The last error a loaded mod's host-called callback threw or rejected with, shown in its Labs row */
export interface ModCallbackError {
	/** The `ctx` subscription whose callback failed */
	callback: 'onNoteSaved' | 'onNoteMoved' | 'onNoteCreated' | 'watch' | 'theme.onChange';
	/** The thrown value's message, or the value as a string */
	message: string;
	/** The stack, when the thrown value is an `Error` */
	stack?: string;
	/** When it failed, from `Date.now()` */
	at: number;
}

/** One entry per mod folder, sorted by folder */
let entries = $state.raw<ModStatusEntry[]>([]);
/**
 * Last callback error per mod folder. Kept apart from `entries`: the first
 * `onload` can subscribe and fail before its entry exists, and `upsertEntry`
 * replaces the whole entry.
 */
let callbackErrors = $state.raw<Record<string, ModCallbackError>>({});

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

	/** Drops the entry of a folder, if any */
	removeEntry(folder: string) {
		entries = entries.filter((e) => e.folder !== folder);
	},

	/** The folder's last callback error, or null */
	callbackErrorFor(folder: string): ModCallbackError | null {
		return callbackErrors[folder] ?? null;
	},

	/** Replaces the folder's last callback error */
	recordCallbackError(folder: string, err: ModCallbackError) {
		callbackErrors = { ...callbackErrors, [folder]: err };
	},

	/** Drops the folder's last callback error, if any; the other folders keep theirs */
	clearCallbackError(folder: string) {
		if (!(folder in callbackErrors)) return;
		const { [folder]: _dropped, ...rest } = callbackErrors;
		callbackErrors = rest;
	},

	/** Empties the list and every callback error */
	reset() {
		entries = [];
		callbackErrors = {};
	},
};
