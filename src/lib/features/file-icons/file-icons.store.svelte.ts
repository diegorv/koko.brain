import type { IconPackId, RecentIcon } from './file-icons.types';

/** Reference to a frontmatter-derived icon (pack + name + optional colors) */
export interface FrontmatterIconRef {
	iconPack: IconPackId;
	iconName: string;
	color?: string;
	titleColor?: string;
}

let recentIcons = $state<RecentIcon[]>([]);
let frontmatterIcons = $state<Map<string, FrontmatterIconRef>>(new Map());
let packVersion = $state(0);

/** Reactive store for file/folder icons */
export const fileIconsStore = {
	get recentIcons() { return recentIcons; },
	get frontmatterIcons() { return frontmatterIcons; },
	/** Version counter incremented when icon packs finish loading into cache */
	get packVersion() { return packVersion; },

	/** Looks up a frontmatter-derived icon for the given path */
	getFrontmatterIcon(path: string): FrontmatterIconRef | undefined {
		return frontmatterIcons.get(path);
	},

	/** Replaces the recently used icons list */
	setRecentIcons(value: RecentIcon[]) {
		recentIcons = value;
	},

	/** Replaces the frontmatter icon index */
	setFrontmatterIcons(value: Map<string, FrontmatterIconRef>) {
		frontmatterIcons = value;
	},

	/** Increments packVersion to trigger reactive re-render in icon consumers */
	bumpPackVersion() {
		packVersion++;
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

	/** Clears all recent icons and frontmatter icons */
	reset() {
		recentIcons = [];
		frontmatterIcons = new Map();
		packVersion = 0;
	},
};
