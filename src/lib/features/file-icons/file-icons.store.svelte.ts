import type { FileIconEntry, IconPackId, RecentIcon } from './file-icons.types';

/** Reference to a frontmatter-derived icon (pack + name) */
interface FrontmatterIconRef {
	iconPack: IconPackId;
	iconName: string;
}

let entries = $state<FileIconEntry[]>([]);
let cachedEntriesMap = $state<Map<string, FileIconEntry>>(new Map());
let recentIcons = $state<RecentIcon[]>([]);
let frontmatterIcons = $state<Map<string, FrontmatterIconRef>>(new Map());

/** Reactive store for custom file/folder icons */
export const fileIconsStore = {
	get entries() { return entries; },
	/** Map of path → FileIconEntry for quick lookups (cached, rebuilt on setEntries) */
	get entriesMap() { return cachedEntriesMap; },
	get recentIcons() { return recentIcons; },
	get frontmatterIcons() { return frontmatterIcons; },

	/** Looks up a custom icon for the given path */
	getIcon(path: string): FileIconEntry | undefined {
		return cachedEntriesMap.get(path);
	},

	/** Looks up a frontmatter-derived icon for the given path */
	getFrontmatterIcon(path: string): FrontmatterIconRef | undefined {
		return frontmatterIcons.get(path);
	},

	/** Checks if a path has a custom icon */
	hasIcon(path: string): boolean {
		return cachedEntriesMap.has(path);
	},

	/** Replaces the entire entries list (used on load) */
	setEntries(value: FileIconEntry[]) {
		entries = value;
		cachedEntriesMap = new Map(value.map((e) => [e.path, e]));
	},

	/** Replaces the recently used icons list */
	setRecentIcons(value: RecentIcon[]) {
		recentIcons = value;
	},

	/** Replaces the frontmatter icon index */
	setFrontmatterIcons(value: Map<string, FrontmatterIconRef>) {
		frontmatterIcons = value;
	},

	/** Updates or removes a single frontmatter icon entry */
	updateFrontmatterIcon(path: string, ref: FrontmatterIconRef | null) {
		const next = new Map(frontmatterIcons);
		if (ref) {
			next.set(path, ref);
		} else {
			next.delete(path);
		}
		frontmatterIcons = next;
	},

	/** Clears all custom icons, recent icons, and frontmatter icons */
	reset() {
		entries = [];
		cachedEntriesMap = new Map();
		recentIcons = [];
		frontmatterIcons = new Map();
	},
};
