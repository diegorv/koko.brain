/** Icon assignment applied to moved files */
export interface AutoMoveIcon {
	/** Icon pack identifier */
	iconPack: import('$lib/features/file-icons/file-icons.types').IconPackId;
	/** Icon name within the pack (or emoji character) */
	iconName: string;
	/** Optional hex color override for the icon (e.g. '#ff5733') */
	color?: string;
	/** Optional hex color override for the filename text (e.g. '#ff5733') */
	textColor?: string;
}

/** A single auto-move rule that maps an expression to a destination folder */
export interface AutoMoveRule {
	/** Unique identifier (timestamp-based) */
	id: string;
	/** Human-readable label for the rule */
	name: string;
	/** Expression string evaluated against NoteRecord (uses collection expression system) */
	expression: string;
	/** Destination folder path relative to vault root (e.g. "Archive/done") */
	destination: string;
	/** Whether this rule is active */
	enabled: boolean;
	/** Optional icon to apply to the file after moving */
	icon?: AutoMoveIcon;
}

/** Persisted auto-move configuration stored in .kokobrain/auto-move-rules.json */
export interface AutoMoveConfig {
	/** Ordered list of rules — first match wins */
	rules: AutoMoveRule[];
	/** Folder paths (vault-relative) excluded from auto-move evaluation */
	excludedFolders: string[];
}

/** Settings for the auto-move feature, persisted inside AppSettings */
export interface AutoMoveSettings {
	/** Whether auto-move is globally enabled */
	enabled: boolean;
	/** Debounce delay in milliseconds after save before evaluating rules */
	debounceMs: number;
}
