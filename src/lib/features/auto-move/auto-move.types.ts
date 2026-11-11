/** Icon assignment applied to moved files */
export interface AutoMoveIcon {
	/** Icon pack identifier */
	iconPack: import('#lib/features/file-icons/file-icons.types.js').IconPackId;
	/** Icon name within the pack (or emoji character) */
	iconName: string;
	/** Optional hex color override for the icon (e.g. '#ff5733') */
	color?: string;
	/** Optional hex color override for the filename text (e.g. '#ff5733') */
	textColor?: string;
}

/** A property a matching rule writes to the note's frontmatter */
export interface RuleProperty {
	/** Frontmatter key; compared by its canonical form (`icon` is `_icon`) */
	key: string;
	/** Literal value; its JSON type decides the YAML type written */
	value: string | number | boolean | string[];
	/**
	 * `if-missing` writes only when the key is absent, null, `''` or `[]`;
	 * `always` writes whenever the current value differs.
	 */
	mode: 'if-missing' | 'always';
}

/** A single auto-move rule: a filter plus a move and/or property consequences */
export interface AutoMoveRule {
	/** Unique identifier (timestamp-based) */
	id: string;
	/** Human-readable label for the rule */
	name: string;
	/** Expression string evaluated against PropertyIndexRecord (uses collection expression system) */
	expression: string;
	/**
	 * Destination folder path relative to vault root (e.g. "Archive/done").
	 * Blank means the rule never moves the note; a template that resolves to
	 * `''` still means the vault root.
	 */
	destination: string;
	/** Whether this rule is active */
	enabled: boolean;
	/** Optional icon to apply to the file after moving */
	icon?: AutoMoveIcon;
	/** Properties written to the note when the rule matches, in list order */
	properties?: RuleProperty[];
}

/** Persisted auto-move configuration stored in .kokobrain/auto-move-rules.json */
export interface AutoMoveConfig {
	/** Ordered list of rules: the first matching rule with a destination moves, a higher rule's property wins */
	rules: AutoMoveRule[];
	/** Folder paths (vault-relative) excluded from auto-move evaluation */
	excludedFolders: string[];
}
