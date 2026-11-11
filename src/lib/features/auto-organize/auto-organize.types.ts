/** Icon assignment applied to moved files */
export interface AutoOrganizeIcon {
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

/** A single auto-organize rule: a filter plus a move and/or property consequences */
export interface AutoOrganizeRule {
	/** Unique identifier (timestamp-based) */
	id: string;
	/** Human-readable label for the rule */
	name: string;
	/**
	 * The rule's filter, the shape a view stores: an expression string, or an
	 * `and` / `or` / `not` object evaluated by the Collection filter.
	 */
	expression: import('#lib/features/collection/collection.types.js').FilterItem;
	/**
	 * Destination folder path relative to vault root (e.g. "Archive/done").
	 * Blank means the rule never moves the note; a template that resolves to
	 * `''` still means the vault root.
	 */
	destination: string;
	/** Whether this rule is active */
	enabled: boolean;
	/** Optional icon to apply to the file after moving */
	icon?: AutoOrganizeIcon;
	/** Properties written to the note when the rule matches, in list order */
	properties?: RuleProperty[];
}

/** Persisted auto-organize configuration stored in .kokobrain/auto-organize-rules.json */
export interface AutoOrganizeConfig {
	/** Ordered list of rules: the first matching rule with a destination moves, a higher rule's property wins */
	rules: AutoOrganizeRule[];
	/** Folder paths (vault-relative) excluded from auto-organize evaluation */
	excludedFolders: string[];
}
