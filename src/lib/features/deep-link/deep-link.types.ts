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

/**
 * Capture kinds in the v2 capture schema.
 *
 * - `note` — free-form note text (no source guaranteed).
 * - `clip` — highlighted text from a source page (expects `source_url`).
 * - `link` — bookmark of a canonical URL with optional page title.
 * - `shot` — screenshot stored at a local file path. Rendered as a `file://`
 *   CommonMark image link in the quick note.
 * - `file` — arbitrary local file path attached to the capture. Rendered as a
 *   `file://` CommonMark link in the quick note.
 */
export type CaptureKind = 'note' | 'clip' | 'link' | 'shot' | 'file';

/**
 * Fields shared by every v2 capture variant. The parser maps snake_case URI
 * params (`source_app`, `source_title`, `source_url`, `captured_at`) to the
 * camelCase fields used in the typed action so consumers stay aligned with the
 * rest of the codebase (see `NoteEntryV2`, `FileTreeNode.path`, etc.).
 */
interface CaptureCommon extends BaseAction {
	type: 'capture';
	/** Optional tags to inject into the note's YAML frontmatter (comma-separated in URI) */
	tags?: string[];
	/** Bundle id of the foreground app at capture time (e.g. `com.google.Chrome`) */
	sourceApp?: string;
	/** Title of the source window/page at capture time */
	sourceTitle?: string;
	/** URL of the source page at capture time */
	sourceUrl?: string;
	/** ISO 8601 timestamp of when the capture happened */
	capturedAt?: string;
}

/** kokobrain://capture?v=2&kind=note&vault=X&text=Y — capture a free-form note */
export interface CaptureNoteAction extends CaptureCommon {
	kind: 'note';
	/** Note body text */
	text: string;
}

/** kokobrain://capture?v=2&kind=clip&vault=X&text=Y&source_url=Z — capture highlighted text from a page */
export interface CaptureClipAction extends CaptureCommon {
	kind: 'clip';
	/** Clipped text */
	text: string;
}

/** kokobrain://capture?v=2&kind=link&vault=X&url=Y&title=Z — capture a canonical link */
export interface CaptureLinkAction extends CaptureCommon {
	kind: 'link';
	/** Canonical URL of the link */
	url: string;
	/** Optional page title; injected into YAML frontmatter as `title:` when present */
	title?: string;
}

/**
 * kokobrain://capture?v=2&kind=shot&vault=X&path=/abs/path.png&mime=image/png —
 * capture a screenshot file path. Quick-capture emits `blob_path` for pasted-bytes
 * screenshots (app-owned, stable) and `source_path` for drag-in screenshots; both
 * arrive here as `path`.
 */
export interface CaptureShotAction extends CaptureCommon {
	kind: 'shot';
	/** Absolute local path to the image file */
	path: string;
	/** Optional MIME type emitted by quick-capture (e.g. `image/png`) */
	mime?: string;
}

/**
 * kokobrain://capture?v=2&kind=file&vault=X&path=/abs/path&mime=...&original_name=notes.pdf —
 * capture an arbitrary local file path. `original_name` is the user-facing filename
 * preserved by quick-capture; the renderer uses it as the link label.
 */
export interface CaptureFileAction extends CaptureCommon {
	kind: 'file';
	/** Absolute local path to the file */
	path: string;
	/** Optional MIME type emitted by quick-capture */
	mime?: string;
	/** Optional user-facing filename; falls back to the path basename when absent */
	originalName?: string;
}

/**
 * Discriminated union of v2 capture actions, branched by `kind`.
 *
 * The v1 schema (`?content=...&tags=...&title=...` without `v` or `kind`) was
 * removed in favor of this typed schema. Old quick-capture builds that still
 * emit v1 URIs will fail with a `Missing required parameter` toast.
 */
export type CaptureAction =
	| CaptureNoteAction
	| CaptureClipAction
	| CaptureLinkAction
	| CaptureShotAction
	| CaptureFileAction;

/** Discriminated union of all deep-link actions */
export type DeepLinkAction = OpenAction | NewAction | SearchAction | DailyAction | CaptureAction;

/** Result of parsing a deep-link URI — either a valid action or an error */
export type ParseResult =
	| { ok: true; action: DeepLinkAction }
	| { ok: false; error: string };
