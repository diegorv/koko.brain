/** All supported deep-link URI actions */
export type DeepLinkActionType = 'open' | 'new' | 'search' | 'daily' | 'capture';

/** Base interface shared by all deep-link actions */
interface BaseAction {
	type: DeepLinkActionType;
	/** Vault name (matched case-insensitively against recent vaults) */
	vault: string;
}

/** kokobrain://open?vault=X&file=Y&path=Z — open a vault and/or file */
export interface OpenAction extends BaseAction {
	type: 'open';
	/** Relative file path within the vault */
	file?: string;
	/** Alias for file (alternative param name) */
	path?: string;
}

/** kokobrain://new?vault=X&name=Y&content=Z&silent=true&append=true — create a new note */
export interface NewAction extends BaseAction {
	type: 'new';
	/** File name or relative path for the new note */
	name?: string;
	/** Full relative path for the new note (Clipper compat: `file=path/name`) */
	file?: string;
	/** Initial content for the note */
	content?: string;
	/** If true, create the note without opening it in the editor */
	silent?: boolean;
	/** If true, append content to an existing file instead of overwriting */
	append?: boolean;
	/** If true, prepend content to the beginning of an existing file */
	prepend?: boolean;
	/** If true, overwrite the file entirely even if it already exists */
	overwrite?: boolean;
	/** If true, read content from system clipboard instead of `content` param */
	clipboard?: boolean;
}

/** kokobrain://search?vault=X&query=Y — open search with a query */
export interface SearchAction extends BaseAction {
	type: 'search';
	/** Search query string */
	query: string;
}

/** kokobrain://daily?vault=X — open or create today's daily note */
export interface DailyAction extends BaseAction {
	type: 'daily';
	/** Content to add to the daily note */
	content?: string;
	/** If true, append content to the daily note */
	append?: boolean;
	/** If true, prepend content to the beginning of the daily note */
	prepend?: boolean;
	/** If true, read content from system clipboard instead of `content` param */
	clipboard?: boolean;
}

/** kokobrain://capture?vault=X&content=Y&tags=a,b — quick capture a note using quick-note settings */
export interface CaptureAction extends BaseAction {
	type: 'capture';
	/** Content to capture */
	content: string;
	/** Optional tags to inject into the note's YAML frontmatter (comma-separated in URI) */
	tags?: string[];
}

/** Discriminated union of all deep-link actions */
export type DeepLinkAction = OpenAction | NewAction | SearchAction | DailyAction | CaptureAction;

/** Result of parsing a deep-link URI — either a valid action or an error */
export type ParseResult =
	| { ok: true; action: DeepLinkAction }
	| { ok: false; error: string };
