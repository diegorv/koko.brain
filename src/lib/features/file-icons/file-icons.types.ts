/** Supported icon pack identifiers */
export type IconPackId =
	| 'lucide'
	| 'feather'
	| 'fa-solid'
	| 'fa-regular'
	| 'fa-brands'
	| 'octicons'
	| 'boxicons'
	| 'coolicons'
	| 'simple-icons'
	| 'tabler'
	| 'remix'
	| 'emoji';

/** A custom icon assigned to a file or folder */
export interface FileIconEntry {
	/** Absolute path to the file or folder */
	path: string;
	/** Which icon pack this icon belongs to */
	iconPack: IconPackId;
	/** Icon identifier (icon name for SVG packs, or emoji character) */
	iconName: string;
	/** Optional hex color override for the icon (e.g. '#ff5733') */
	color?: string;
	/** Optional hex color override for the filename text (e.g. '#ff5733') */
	textColor?: string;
}

/** A recently used icon reference (pack + name, no path) */
export interface RecentIcon {
	/** Which icon pack this icon belongs to */
	iconPack: IconPackId;
	/** Icon identifier within its pack */
	iconName: string;
}

/** Metadata about an available icon pack */
export interface IconPackMeta {
	/** Unique pack identifier */
	id: IconPackId;
	/** Human-readable label */
	label: string;
	/** Total number of icons in the pack */
	iconCount: number;
}

/** A normalized icon ready for rendering */
export interface NormalizedIcon {
	/** Icon identifier within its pack */
	name: string;
	/** Which pack this icon belongs to */
	pack: IconPackId;
	/** Inner SVG markup (paths, circles, etc.) — no outer <svg> tag */
	svgContent: string;
	/** SVG viewBox attribute (e.g. '0 0 24 24') */
	viewBox: string;
	/** Search keywords for filtering */
	keywords: string[];
}
