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
