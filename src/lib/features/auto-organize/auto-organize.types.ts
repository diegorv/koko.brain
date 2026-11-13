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

/** A literal rule property value; its JSON type decides the YAML type written */
export type RuleValue = string | number | boolean | string[];

/** A property a matching rule writes to, or removes from, the note's frontmatter */
export interface RuleProperty {
	/** Frontmatter key; compared by its canonical form (`icon` is `_icon`) */
	key: string;
	/**
	 * The value to write. `if-missing`, `always` and `add` need it or `expr`,
	 * never both; for `add`, the items, a text or a list of text. `remove`
	 * ignores it.
	 */
	value?: RuleValue;
	/**
	 * An expression, evaluated against the note like the rule's filter, whose
	 * result is written instead of `value`. `remove` ignores it.
	 */
	expr?: string;
	/**
	 * `if-missing` writes only when the key is absent, null, `''` or `[]`;
	 * `always` writes whenever the current value differs;
	 * `remove` deletes the key when the note has it;
	 * `add` appends the items the list does not hold yet.
	 */
	mode: 'if-missing' | 'always' | 'remove' | 'add';
}

/** A note a matching rule creates when it does not exist yet */
export interface RuleCreateNote {
	/**
	 * Vault-relative path of the new note, ending in `.md`. Supports the
	 * destination `{variable}` templates, resolved against the source note
	 * (e.g. `{folder}/{basename} follow-up.md`).
	 */
	path: string;
	/** Vault-relative path of the template note the new note starts from */
	template?: string;
	/**
	 * Properties written to the new note's frontmatter, over the template's.
	 * `expr` and the variables read the source note. `remove` is not allowed.
	 */
	properties?: RuleProperty[];
	/** Opens the new note in a background tab; false by default */
	open?: boolean;
}

/**
 * The name a matching rule gives the note, without its extension: exactly
 * one of `name` and `expr`. Neither may read the note's own name, which would
 * change it again at every save.
 */
export interface RuleRename {
	/** A file-name template with the destination `{variable}` syntax (e.g. `{year}-{month} Meeting`) */
	name?: string;
	/** An expression, evaluated against the note like the rule's filter, whose result is the name */
	expr?: string;
}

/** A single auto-organize rule: a filter plus rename, move, property and create-note consequences */
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
	/** A note created when the rule matches, unless it exists already */
	createNote?: RuleCreateNote;
	/** The note's new name; only the first matching rule with one renames */
	rename?: RuleRename;
	/** A mod action run on the note; only the first matching rule with one runs it */
	runAction?: RuleRunAction;
}

/** A mod action a matching rule runs on the note, after every other consequence */
export interface RuleRunAction {
	/** The action's id, `mod:<mod>:action:<action>`; the mod must list the action in its manifest's `ruleActions` */
	id: string;
	/** The text passed to an action that declares `input`; ignored by any other action */
	input?: string;
}

/** Persisted auto-organize configuration stored in .kokobrain/auto-organize-rules.json */
export interface AutoOrganizeConfig {
	/** Ordered list of rules: the first matching rule with a destination moves, a higher rule's property wins */
	rules: AutoOrganizeRule[];
	/** Folder paths (vault-relative) excluded from auto-organize evaluation */
	excludedFolders: string[];
}
