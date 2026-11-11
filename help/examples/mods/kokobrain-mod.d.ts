// Type declarations for Kokobrain vault mods, for checking a plain `main.js`
// in an editor (or with `tsc`). Standalone: no imports; it needs only the DOM
// lib (for `AbortSignal`, `DOMException` and `HTMLElement`).
//
// Use from a mod: put this file next to `main.js` and annotate the default
// export in a JSDoc comment. The type lives only in the comment, so the loader
// never sees it (a real `import` would make the mod fail to load):
//
//   // @ts-check
//   /** @type {import('./kokobrain-mod').Mod} */
//   const mod = {
//   	onload(ctx) {
//   		ctx.addAction({ id: 'hi', title: 'Say hi', run: () => ctx.notify('Hi') });
//   	},
//   };
//   export default mod;
//
// `Mod` gives `ctx` the full `ModContext` (stable contract plus `labs`, `app`
// and `kb`). Use `ModV1` instead to type a mod against the stable contract
// only, so any use of `ctx.labs`, `ctx.app` or `ctx.kb` is a type error.
// Guide: help/documentation/mods/12-types-build-and-test.md
//
// The file has three parts, each marked by a banner:
// 1. STABLE: contract v1, verbatim from the app's contract (the `...V1` types).
//    src/tests/help/mods-types.test.ts fails the app's type check when this
//    part drifts from the contract the app is built against.
// 2. UNSTABLE: `ctx.labs`. Experimental, outside contract v1.
// 3. RAW: `ctx.app` and `ctx.kb()`, the app's live internals. Hand-written,
//    partial and loose; nothing checks them against the app, and they can
//    change in any release.

// ===========================================================================
// 1. STABLE: vault mods API, contract version 1
// ===========================================================================

/** The mod's identity, from its manifest */
export interface ModInfoV1 {
	/** Manifest id, equal to the mod's folder name */
	id: string;
	/** Manifest display name */
	name: string;
	/** Manifest version string */
	version: string;
	/** Vault-relative folder of the mod, e.g. `_system/mods/hello` */
	dir: string;
}

/** Toast style for `ctx.notify` */
export type ModNotifyKindV1 = 'info' | 'success' | 'warning' | 'error';

/** Options for `ctx.notify` */
export interface ModNotifyOptionsV1 {
	/** Toast style; `'info'` when omitted */
	kind?: ModNotifyKindV1;
}

/** One line of text an action asks for before it runs */
export interface ModActionInputV1 {
	/** Placeholder of the text field */
	placeholder?: string;
}

/**
 * What a running action receives as its second argument. The picker shows the
 * run: its progress bar, its log, and Stop.
 */
export interface ModRunV1 {
	/** Clicked menu target; absent from rail and palette invocations. */
	target?: {
		/** Surface the action was selected from */
		on: 'note' | 'folder';
		/** Vault-relative path; an empty string is the vault root */
		path: string;
	};
	/**
	 * Aborted on Stop, when the mod unloads (mods switched off, the mod switched
	 * off or deleted) and when the vault closes; not when the mod reloads after a
	 * save, which waits for its runs to end. Check `signal.aborted` between steps
	 * or pass it to `fetch`: a synchronous loop cannot be stopped.
	 */
	signal: AbortSignal;
	/** Adds a line to the run's log; the run view keeps the last 500 */
	log: (text: string) => void;
	/** Sets the progress bar to `done` of `total`, with an optional label */
	progress: (done: number, total: number, label?: string) => void;
	/**
	 * The dialogs of this run, with the same methods as `ctx.ui`. Use it in
	 * actions, and `ctx.ui` outside them.
	 *
	 * When `signal` aborts (Stop or unload), the run's open and queued dialogs
	 * close and their promises reject with a `DOMException` named `AbortError`,
	 * so the action stops at its next `await`; later calls reject with it at once.
	 * `loading`'s task signal also aborts then, and its promise rejects without
	 * waiting for the task, whose JavaScript may still be running. The user
	 * cancelling a dialog still resolves `undefined` / `false` / `null`.
	 */
	ui: ModUiV1;
}

/**
 * An action a mod adds with `ctx.addAction`; its rail buttons list it in their
 * picker. An action has one live run at a time: starting it again while it runs
 * opens the live run instead of starting another.
 */
export interface ModActionV1 {
	/** Unique within the mod */
	id: string;
	/** Picker row title, also named in the error toast when `run` fails */
	title: string;
	/** Picker row subtitle */
	description?: string;
	/** When set, picking the action shows a text field; Enter runs it with the text, Escape cancels */
	input?: ModActionInputV1;
	/**
	 * Runs the action with the typed text (`''` without `input`) and its run;
	 * may be async. A throw or rejection ends the run failed and shows an error
	 * toast, unless the run's signal was aborted first.
	 */
	run: (input: string, run: ModRunV1) => unknown;
}

/**
 * A rail button a mod adds with `ctx.addRailButton`; a click opens a picker of
 * its actions, or, when it resolves to one action, runs it (or opens its text field)
 */
export interface ModRailButtonV1 {
	/** Unique within the mod */
	id: string;
	/** Button tooltip and picker title */
	title: string;
	/** Icon ref, `pack:name` (e.g. `lucide:sparkles`) or a bare lucide name */
	icon: string;
	/** Action ids the picker lists, in this order; every action of the mod when omitted. Unknown ids are skipped */
	actions?: string[];
}

/** A direct child of a folder, as `ctx.vault.list` returns it */
export interface ModVaultEntryV1 {
	/** File or folder name, e.g. `Idea.md` */
	name: string;
	/** Vault-relative path, e.g. `Ideas/Idea.md` */
	path: string;
	/** Whether the entry is a folder */
	isFolder: boolean;
}

/** One frontmatter property, as `ctx.vault.updateFrontmatter` hands them to `mutate` */
export interface ModPropertyV1 {
	/** The YAML key, e.g. `status` */
	key: string;
	/** The parsed value; a `list` property holds a `string[]` */
	value: string | number | boolean | string[];
	/** The value's type, detected from the YAML on read and used to write it back */
	type: 'text' | 'list' | 'number' | 'date' | 'boolean';
}

/**
 * Vault file access for a mod. Every path is vault-relative (`Ideas/Idea.md`):
 * a path that is empty, starts with `/`, or has an empty, `.` or `..` segment
 * rejects with `Invalid vault path "<path>"`. File system errors reject as they come.
 */
export interface ModVaultV1 {
	/** Resolves to the file's text */
	read: (path: string) => Promise<string>;
	/** Resolves to whether a file or folder exists at `path` */
	exists: (path: string) => Promise<boolean>;
	/** Resolves to the folder's direct children (no recursion, dot entries left out); `''` lists the vault root */
	list: (folder: string) => Promise<ModVaultEntryV1[]>;
	/**
	 * Creates a new file at exactly `path`, creating missing parent folders, and
	 * resolves to `path`. Rejects with `"<path>" already exists; use write` when
	 * something is already there; never renames.
	 */
	create: (path: string, content: string) => Promise<string>;
	/**
	 * Overwrites an existing file; an open tab shows the new content. Rejects
	 * with `"<path>" does not exist; use create` for a missing file, and with
	 * `"<path>" has unsaved changes in an open tab` instead of losing the user's edits.
	 */
	write: (path: string, content: string) => Promise<void>;
	/**
	 * Rewrites the frontmatter of the Markdown note at `path` (`.md`, `.markdown`)
	 * and leaves its body as it is. Any other file rejects with
	 * `Mod "<id>": vault.updateFrontmatter needs a Markdown note`, nothing written;
	 * a missing note rejects with the read error.
	 *
	 * `mutate` gets the current properties in file order and returns the new full
	 * list. It must be pure: it can run twice.
	 *
	 * Nothing is written when the rebuilt note equals the file byte for byte. The
	 * first write may normalize the YAML (a block list becomes a flow list), so
	 * returning the same array does not promise that nothing is written.
	 *
	 * An open tab keeps its unsaved body edits and is saved at once; unlike
	 * `write`, a dirty tab is not refused. A tab whose path holds `//` (a daily
	 * note under a folder setting ending in `/`) is not found, as with `write`.
	 *
	 * A refused or failed write rejects with an `Error` whose `name` is
	 * `FrontmatterWriteError` and whose
	 * `reason` is one of `unparseable`, `nested`, `comments`, `duplicate-keys`,
	 * `alias-collision`, `anchors` (lossy frontmatter, nothing written),
	 * `save-failed` (the editor already showed a toast; show no other),
	 * `vault-changed` or `missing`. `writeFailureText(err)` from
	 * `@kokobrain/mod-core/errors` turns it into text for the user.
	 *
	 * Concurrent calls on one note race and the last write wins: call it one note
	 * at a time. It is a save, so it fires `onNoteSaved`, the mod's own included
	 * unless it subscribed with `ignoreOwnWrites`: a callback that writes the
	 * note it was told about can loop.
	 */
	updateFrontmatter: (path: string, mutate: (props: ModPropertyV1[]) => ModPropertyV1[]) => Promise<void>;
	/** Renames a file or folder within its parent; newName is one name, including any extension. Resolves to the new relative path. */
	rename: (path: string, newName: string) => Promise<string>;
	/** Moves a file or folder into targetFolder ('' for the vault root). Resolves to its relative path, unchanged if already there. */
	move: (path: string, targetFolder: string) => Promise<string>;
	/** Moves a file or folder to Trash, detecting folders and cleaning up their children automatically. */
	delete: (path: string) => Promise<void>;
}

/** The app's workspace, for a mod */
export interface ModWorkspaceV1 {
	/** Opens the note at a vault-relative path in the editor, or switches to its tab; rejects when the note does not exist */
	openNote: (path: string) => Promise<void>;
}

/** Options for `ctx.ui.alert` */
export interface ModAlertOptionsV1 {
	/** Dialog title */
	title: string;
	/** Text under the title */
	message?: string;
	/** Dialog style; `'info'` when omitted */
	kind?: ModNotifyKindV1;
}

/** Options for `ctx.ui.confirm` */
export interface ModConfirmOptionsV1 {
	/** Dialog title */
	title: string;
	/** Text under the title */
	message?: string;
	/** Label of the confirm button; `'OK'` when omitted */
	confirmLabel?: string;
	/** Label of the cancel button; `'Cancel'` when omitted */
	cancelLabel?: string;
	/** Styles the confirm button as destructive */
	destructive?: boolean;
}

/** Options for `ctx.ui.prompt` */
export interface ModPromptOptionsV1 {
	/** Dialog title */
	title: string;
	/** Text under the title */
	message?: string;
	/** Label above the field */
	label?: string;
	/** Placeholder of the field */
	placeholder?: string;
	/** Initial text of the field; `''` when omitted */
	value?: string;
	/** A multi-line field: Cmd+Enter submits, Enter adds a line */
	multiline?: boolean;
}

/** Options for `ctx.ui.loading` */
export interface ModLoadingOptionsV1 {
	/** Adds a Cancel button that aborts the task's signal */
	cancellable?: boolean;
}

/**
 * The app's dialogs, in its theme, with the mod's name as a caption. One
 * shows at a time; a second call waits until the first is closed. When the mod
 * unloads, its dialogs close as cancelled. Each rejects with
 * `Mod "<id>": ...` on bad arguments and `Mod "<id>" is unloaded` after unload.
 * `ctx.ui` dialogs belong to the mod, not to a run, and do not close on Stop;
 * an action uses `run.ui`.
 */
export interface ModUiV1 {
	/** Shows a message; resolves when it is dismissed */
	alert: (options: ModAlertOptionsV1) => Promise<void>;
	/** Asks yes or no; resolves `true` on confirm (Enter), `false` on cancel (Esc) */
	confirm: (options: ModConfirmOptionsV1) => Promise<boolean>;
	/** Asks for text; resolves to it, or to `null` when cancelled */
	prompt: (options: ModPromptOptionsV1) => Promise<string | null>;
	/** Fuzzy-selects an item; returns the original object, or null on cancel. Duplicate ids reject. */
	pick: <T extends { id: string; title: string; description?: string }>(options: {
		/** Dialog title */
		title: string;
		/** Search field hint; defaults to "Search items..." */
		placeholder?: string;
		/** Items with unique ids; all are searchable, with at most 100 matches rendered */
		items: T[];
	}) => Promise<T | null>;
	/**
	 * Runs `task(signal)` at once while a dialog that cannot be dismissed shows
	 * `label` and a spinner, and resolves or rejects with the task. The signal
	 * aborts on Cancel (with `cancellable`) and when the mod unloads.
	 */
	loading: <T>(label: string, task: (signal: AbortSignal) => T | Promise<T>, options?: ModLoadingOptionsV1) => Promise<T>;
}

/**
 * The theme's Global colors, the mod color contract. Each key is a CSS
 * variable on the document (`cardForeground` is `--card-foreground`), which a
 * mod's DOM can use directly; the values here are the resolved ones, in the
 * color syntax the theme uses (`#rrggbb`, `oklch(...)`).
 */
export interface ModThemeColorsV1 {
	/** `--background` */
	background: string;
	/** `--foreground` */
	foreground: string;
	/** `--card` */
	card: string;
	/** `--card-foreground` */
	cardForeground: string;
	/** `--popover` */
	popover: string;
	/** `--popover-foreground` */
	popoverForeground: string;
	/** `--primary` */
	primary: string;
	/** `--primary-foreground` */
	primaryForeground: string;
	/** `--secondary` */
	secondary: string;
	/** `--secondary-foreground` */
	secondaryForeground: string;
	/** `--muted` */
	muted: string;
	/** `--muted-foreground` */
	mutedForeground: string;
	/** `--accent` */
	accent: string;
	/** `--accent-foreground` */
	accentForeground: string;
	/** `--destructive` */
	destructive: string;
	/** `--destructive-foreground` */
	destructiveForeground: string;
	/** `--border` */
	border: string;
	/** `--input` */
	input: string;
	/** `--ring` */
	ring: string;
	/** `--divider` */
	divider: string;
}

/** The applied theme, as `ctx.theme` reports it */
export interface ModThemeStateV1 {
	/** Whether the applied theme is light or dark */
	mode: 'light' | 'dark';
	/** The contract colors, resolved */
	colors: ModThemeColorsV1;
}

/** The app's theme, for a mod that builds its own UI */
export interface ModThemeV1 {
	/** The applied theme, read when accessed */
	readonly current: ModThemeStateV1;
	/**
	 * Calls `callback` with the new theme after every theme change. Returns a
	 * disposer; it is also removed at unload. A throwing callback goes to the
	 * debug log.
	 */
	onChange: (callback: (theme: ModThemeStateV1) => void) => () => void;
}

/**
 * How `ctx.loadData` rejects when `data.json` is not valid JSON. The file was
 * moved aside first, byte for byte, so the next `loadData` resolves to `null`
 * and a later `saveData` cannot overwrite the only copy.
 */
export interface ModDataCorruptErrorV1 extends Error {
	/** Tells this failure from a file system one, which leaves `data.json` in place */
	name: 'ModDataCorruptError';
	/** Vault-relative path of the kept copy, `.kokobrain/mods/<id>/data.corrupt-<timestamp>.json` */
	corruptPath: string;
}

/** What a mod's `onload` receives. Every function throws once the mod is unloaded or the vault changed. */
export interface ModContextV1 {
	/** Contract version, `1` */
	apiVersion: 1;
	/** The mod's identity */
	mod: ModInfoV1;
	/** Aborted when the mod unloads */
	signal: AbortSignal;
	/** Adds a cleanup that runs at unload, after `onunload`, in reverse order of registration */
	register: (dispose: () => void) => void;
	/** Shows a toast prefixed with the mod's name */
	notify: (message: string, options?: ModNotifyOptionsV1) => void;
	/** Writes to the debug log under the `MOD:<id>` tag */
	log: (...args: unknown[]) => void;
	/** Adds an action; throws on a duplicate id. Returns a disposer; it is also removed at unload */
	addAction: (action: ModActionV1) => () => void;
	/**
	 * Adds a rail button; throws on a duplicate id. Returns a disposer; it is also
	 * removed at unload. Clicking it for an action that is running opens that live
	 * run instead of starting another.
	 */
	addRailButton: (button: ModRailButtonV1) => () => void;
	/**
	 * Tracks `read` and calls `onChange` only when its value changes by Object.is,
	 * not at subscription. Both failures go to the mod's debug log. The handler
	 * is untracked. Returns a disposer; it is also removed at unload.
	 */
	watch: <T>(read: () => T, onChange: (value: T) => void) => () => void;
	/**
	 * In a later timer, after the synchronous save observers, reports a saved
	 * note's vault-relative path and the text that was saved. Callback failures
	 * go to the mod's debug log. Returns a disposer; unload also unsubscribes and
	 * cancels pending callbacks.
	 *
	 * `content` is a snapshot: by the time the callback runs, a later save may
	 * have replaced it. Read `content` to decide; to write, read the note again
	 * right before writing. On an app older than `content` and
	 * `ignoreOwnWrites`, `content` is `undefined` and the option is ignored
	 * (`minAppVersion` is not enforced), so check `typeof content === 'string'`.
	 *
	 * With `ignoreOwnWrites: true`, saves caused by this mod's own
	 * `ctx.vault.write` and `ctx.vault.updateFrontmatter` are not reported; while
	 * an `updateFrontmatter` call is in flight, any save of that note is skipped,
	 * an editor save included. Edits through `ctx.app` or the editor are saves like any other, including
	 * `editNote` on the open tab, which saves through autosave; `editNote` on
	 * disk goes through `ctx.vault.write` and is skipped. The option filters
	 * only this mod's writes: another mod's write, or an Auto Organize rule
	 * running this mod's action, can still start a loop. Without the option a
	 * callback that writes again with `ctx.vault.write` can loop; either way,
	 * switching off the mod in Labs stops it.
	 */
	onNoteSaved: (
		callback: (path: string, content: string) => void,
		options?: { ignoreOwnWrites?: boolean },
	) => () => void;
	/** Reads and writes vault files by vault-relative path */
	vault: ModVaultV1;
	/** Opens notes */
	workspace: ModWorkspaceV1;
	/** The app's alert, confirm, prompt and loading dialogs */
	ui: ModUiV1;
	/** The theme's colors */
	theme: ModThemeV1;
	/**
	 * Resolves to what `saveData` last saved, or to `null` when the file is not
	 * there. Rejects with a `ModDataCorruptErrorV1` when it is not valid UTF-8
	 * JSON, and with an `Error` when it cannot be read or moved aside: `saveData`
	 * then refuses until a later load resolves or reports the file as corrupt, or the mod reloads.
	 */
	loadData: () => Promise<unknown>;
	/**
	 * Saves `data` as `<vault>/.kokobrain/mods/<id>/data.json`, atomically, off the
	 * index, search, file history and Auto Organize. Calls land in order, so the last
	 * one wins; `data` is read at the call. Rejects `Mod "<id>": ...` when JSON
	 * cannot represent it or the last load could not read or move the file, and with an `Error` when the
	 * write fails. A mod that never loads replaces whatever the file held.
	 */
	saveData: (data: unknown) => Promise<void>;
}

/** The default export of a mod's `main.js` */
export interface ModV1 {
	/** Called once when the mod loads; may be async */
	onload: (ctx: ModContextV1) => unknown;
	/** Called once when the mod unloads, before the registered cleanups */
	onunload?: () => unknown;
}

// ===========================================================================
// 2. UNSTABLE: ctx.labs
// Experimental entry points outside contract v1. They can change or go away in
// any app release without an `apiVersion` bump.
// ===========================================================================

/**
 * UNSTABLE. Where `ctx.labs.place` shows an action. Give at least one of
 * `palette` or `menu` (the type cannot say so): `{}` throws
 * `Mod "<id>": labs.place needs palette: true or menu`.
 */
export interface ModPlacement {
	/** Lists the action in the command palette as `<Mod name>: <Action title>`; must be exactly `true` */
	palette?: true;
	/** Adds the action to context menus */
	menu?: {
		/** `'note'`: rows of the rail note list; `'folder'`: folder rows and the vault root of the Files navigator */
		on: ('note' | 'folder')[];
		/** Note rows that show it: `'markdown'` (`.md`, `.markdown`; the default) or `'all'`. Ignored for folders */
		files?: 'markdown' | 'all';
	};
}

/** UNSTABLE. `ctx.labs` */
export interface ModLabs {
	/**
	 * Places an action this mod already added with `ctx.addAction`. Returns a
	 * disposer; removing the action or unloading the mod also removes the
	 * placement. A later placement with `menu` replaces the earlier menu entry.
	 * Throws `Mod "<id>": unknown action id "<actionId>"` for an action that is not registered.
	 */
	place: (actionId: string, options: ModPlacement) => () => void;
}

// ===========================================================================
// 3. RAW: ctx.app and ctx.kb()
// The app's own live objects, typed by hand: only the members a mod usually
// needs, often looser or narrower than the real ones. No compatibility
// promise, and no test checks them against the app. Every path here is
// ABSOLUTE (`${ctx.app.vaultStore.path}/Folder/Note.md`), unlike `ctx.vault`.
// Member by member: help/documentation/mods/09-raw-app.md
// ===========================================================================

/** RAW. An open editor tab */
export interface RawEditorTab {
	/** Absolute path; virtual tabs (tasks, tags, graph, event calendar) start with `__virtual__/` */
	path: string;
	/** Display name (the file name) */
	name: string;
	/** Current text, which may hold unsaved edits */
	content: string;
	/** Last saved text; the tab is dirty when it differs from `content` */
	savedContent: string;
	/** `undefined` for notes and plain text or code files */
	fileType?: 'markdown' | 'collection' | 'tasks' | 'graph' | 'tags' | 'canvas' | 'kanban' | 'event-calendar';
	/** Whether the tab is pinned */
	pinned?: boolean;
}

/** RAW. One line of a CodeMirror document */
export interface RawEditorLine {
	/** Offset of the line start */
	from: number;
	/** Offset of the line end, before the line break */
	to: number;
	/** 1-based line number */
	number: number;
	/** Text of the line, without the line break */
	text: string;
}

/** RAW. A CodeMirror document (`view.state.doc`) */
export interface RawEditorDoc {
	/** Length in characters */
	length: number;
	/** Number of lines */
	lines: number;
	/** The line with a 1-based number */
	line: (n: number) => RawEditorLine;
	/** The line around an offset */
	lineAt: (pos: number) => RawEditorLine;
	/** Text between two offsets */
	sliceString: (from: number, to?: number) => string;
	/** The whole text */
	toString: () => string;
}

/** RAW. One text change: replace `from`..`to` (default `from`) with `insert` (default `''`) */
export interface RawEditorChange {
	from: number;
	to?: number;
	insert?: string;
}

/** RAW. The plain-object part of a CodeMirror transaction spec a mod can build without CodeMirror */
export interface RawEditorTransaction {
	/** Offsets refer to the document before the change */
	changes?: RawEditorChange | readonly RawEditorChange[];
	/** New selection; a caret when `head` is omitted */
	selection?: { anchor: number; head?: number };
	/** Scrolls the selection into view */
	scrollIntoView?: boolean;
	/** Groups the change in the undo history, e.g. `'input'` */
	userEvent?: string;
}

/** RAW. The editor state (`view.state`); read it at use time, it changes with every edit and tab switch */
export interface RawEditorState {
	doc: RawEditorDoc;
	selection: { main: { from: number; to: number; anchor: number; head: number; empty: boolean } };
	/** A CodeMirror transaction spec that replaces the selection with `text`; pass it to `dispatch` unread */
	replaceSelection: (text: string) => RawOpaqueEditorSpec;
}

/** RAW. A CodeMirror-built spec (its `changes` is a `ChangeSet`, not plain objects): only pass it to `dispatch` */
export interface RawOpaqueEditorSpec {
	readonly __codemirrorSpec: never;
}

/**
 * RAW. The CodeMirror `EditorView`, only the members a plain-JS mod can use.
 * One view is shared by the Markdown tabs and replaced after a canvas, kanban,
 * collection or virtual tab: re-read `editorStore.editorView` at each use and
 * check `dom.isConnected`.
 */
export interface RawEditorView {
	dom: HTMLElement;
	contentDOM: HTMLElement;
	scrollDOM: HTMLElement;
	state: RawEditorState;
	/** Applies an edit like typing does: marks the tab dirty, arms autosave, adds an undo step */
	dispatch: (...specs: (RawEditorTransaction | RawOpaqueEditorSpec)[]) => void;
	focus: () => void;
}

/** RAW. `ctx.app.editorStore` (reactive: usable in `ctx.watch`) */
export interface RawEditorStore {
	readonly tabs: RawEditorTab[];
	/** `-1` when no tab is active */
	readonly activeIndex: number;
	readonly activeTab: RawEditorTab | null;
	/** Absolute path of the active tab; the narrowest value to watch */
	readonly activeTabPath: string | null;
	/** Text of the active tab; changes on every keystroke */
	readonly activeTabContent: string | null;
	/** `false` in source mode */
	readonly isLivePreview: boolean;
	/** `null` when no tab is active or the active tab is not shown in the text editor */
	readonly editorView: RawEditorView | null;
	/** Switches to an open tab by index */
	setActiveIndex: (index: number) => void;
}

/** RAW. `ctx.app.vaultStore` */
export interface RawVaultStore {
	/** Absolute vault root, no trailing slash; never null while the mod is loaded */
	readonly path: string;
	/** Vault folder name */
	readonly name: string | null;
	/** Bumped (throttled) when the index changes */
	readonly vaultIndexVersion: number;
	/** `false` until the vault's first index build finished */
	readonly indexReady: boolean;
	/** Makes the next index update refresh `ctx.kb()` and the panels at once, instead of after the throttle; call it before the write */
	requestPromptIndexRefresh: () => void;
}

/** RAW. Where `openNoteAt` puts the caret */
export type RawNoteTarget = { kind: 'line'; line: number } | { kind: 'offset'; offset: number };

/** RAW. One frontmatter property, as `updateNoteFrontmatter` hands them to `mutate` */
export interface RawProperty {
	key: string;
	value: string | number | boolean | string[];
	type: 'text' | 'list' | 'number' | 'date' | 'boolean';
}

/** RAW. How `updateNoteFrontmatter` rejects, apart from read errors of a missing file (which come as they are) */
export interface RawFrontmatterWriteError extends Error {
	name: 'FrontmatterWriteError';
	/** `save-failed`: the editor already showed a toast */
	reason:
		| 'unparseable'
		| 'nested'
		| 'comments'
		| 'duplicate-keys'
		| 'alias-collision'
		| 'anchors'
		| 'save-failed'
		| 'vault-changed'
		| 'missing';
	/** Absolute path of the note */
	path: string;
}

/** RAW. A note type the vault defines */
export interface RawTypeMetadata {
	/** Type name, first letter uppercased, e.g. `Project` */
	name: string;
	/** Absolute path of the definition note */
	path: string | null;
	/** Lucide icon name */
	icon: string;
	color: string;
	order: number;
	sidebarLabel: string;
	/** Vault-relative template path */
	template: string | null;
	/** Vault-relative folder of new notes of the type; `null` is the root */
	folder: string | null;
	sort: string;
	view: string;
	visible: boolean;
	listPropertiesDisplay: string[];
	archiveTo: string | null;
	hub: boolean;
}

/** RAW. `ctx.app.typeDefinitionsStore` */
export interface RawTypeDefinitionsStore {
	/** Exact, case-sensitive name match */
	getTypeMetadata: (name: string) => RawTypeMetadata | undefined;
	/** Only types that have a definition note */
	readonly typeMetadataMap: ReadonlyMap<string, RawTypeMetadata>;
	/** A new array on every read, sorted by `order` */
	readonly sortedTypes: RawTypeMetadata[];
}

/** RAW. A person from the app's 1:1 picker */
export interface RawPerson {
	name: string;
	/** Absolute path of the person's note */
	path: string;
	context: 'work' | 'personal';
}

/** RAW. One registered mod action, from any mod */
export interface RawModCommand {
	/** `mod:<mod id>:action:<action id>` */
	id: string;
	/** `<Mod name>: <Action title>` */
	label: string;
	/** Starts the action like the palette does (input field, or reveals a live run); returns nothing, throws `Mod "<id>" is unloaded` when stale */
	run: () => void;
	/** Whether a `ctx.labs.place({ palette: true })` placement is live */
	palette: boolean;
}

/** RAW. `ctx.app.modCommandsStore` */
export interface RawModCommandsStore {
	/** New objects on every read: never return it from a `ctx.watch` read; look rows up when calling */
	readonly list: readonly RawModCommand[];
}

/** RAW. A rail action button */
export interface RawRailAction {
	/** Unique key; an entry with the same key replaces it */
	key: string;
	label: string;
	/** `pack:name` or a bare lucide name */
	icon: string;
	color?: { light: string; dark: string };
	busy?: () => boolean;
	run: () => void;
}

/** RAW. A note-row or folder context menu item */
export interface RawMenuItem {
	/** Unique id; an entry with the same id replaces it */
	id: string;
	label: string;
	on: readonly ('note' | 'folder')[];
	files?: 'markdown' | 'all';
	/** `path` is vault-relative; `''` is the vault root */
	run: (target: { on: 'note' | 'folder'; path: string }) => void;
}

/**
 * RAW. `ctx.app.railRegistryStore`. Each register function returns an
 * unregister function: pass it to `ctx.register`, unload does not undo raw
 * registrations. Navigators, lens providers, Today sections and folder
 * creators take Svelte components, so they are left untyped here.
 */
export interface RawRailRegistryStore {
	readonly actions: readonly RawRailAction[];
	readonly menuItems: readonly RawMenuItem[];
	registerAction: (entry: RawRailAction) => () => void;
	registerMenuItem: (entry: RawMenuItem) => () => void;
	registerNavigator: (entry: unknown) => () => void;
	registerLensProvider: (entry: unknown) => () => void;
	registerTodaySection: (entry: unknown) => () => void;
	registerFolderCreator: (entry: unknown) => () => void;
}

/**
 * RAW. `ctx.app.settingsStore`, the live app settings. Only a few fields are
 * typed. Writes PERSIST: the app saves every change to the vault's settings
 * file after a short debounce. It also holds secrets (API tokens).
 */
export interface RawSettingsStore {
	readonly templates: { folder: string; systemFolder: string };
	readonly oneOnOne: { peopleFolder: string; workPeopleFolder: string };
	[key: string]: unknown;
}

/** RAW. Options of `ctx.app.createTypedNote` (it also takes a dayjs `contextDate`, which a plain-JS mod does not have) */
export interface RawTypedNoteOptions {
	/** Written as `_type`; selects the type's folder and template. An unknown name is not an error: the note lands in the root */
	typeName: string;
	/** Note title; a taken name gets a unique suffix */
	title: string;
	/** Rewrites the content before it is written; a throw creates nothing */
	buildContent?: (base: string, target: { fileName: string; title: string; path: string }) => string;
}

/** RAW. Options of `ctx.app.openOrCreateNote` (it also takes a dayjs `contextDate`) */
export interface RawNoteCreationOptions {
	/** Absolute path, including the extension */
	filePath: string;
	/** Title for template expansion */
	title: string;
	/** Absolute template path; falls back to `inlineTemplate` when unreadable */
	templatePath?: string;
	inlineTemplate?: string;
	customVariables?: Record<string, string>;
	/** Runs on creation only; a throw creates nothing */
	buildContent?: (content: string) => string;
}

/** RAW. `ctx.app` */
export interface RawApp {
	editorStore: RawEditorStore;
	vaultStore: RawVaultStore;
	/** Opens or switches to a file; never rejects (failures show a toast): check `editorStore.activeTabPath` afterwards */
	openFileInEditor: (absolutePath: string) => Promise<void>;
	/** Opens the note, then moves the caret after the promise resolves; `null` is a no-op */
	openNoteAt: (absolutePath: string | null, target: RawNoteTarget) => Promise<void>;
	/** Resolves to the absolute path created; does not open it. Rejects `no-vault` or `create-failed` */
	createTypedNote: (options: RawTypedNoteOptions) => Promise<string>;
	/** Opens or creates today's 1:1 note with a person */
	createOneOnOneNote: (personName: string) => Promise<void>;
	/** Resolves when the picker opens; with a callback, picking a person calls it instead of creating the note */
	openOneOnOnePicker: (onSelect?: (person: RawPerson) => void | Promise<void>) => Promise<void>;
	/** Absolute path of a day's daily note (today by default); the note may not exist */
	dailyNotePath: (date?: Date) => string;
	/** Opens today's daily note, creating it from its template when missing */
	openOrCreateDailyNote: () => Promise<void>;
	/** `mutate` must be pure (it can run twice). Resolves to the note's text; rejects with a `RawFrontmatterWriteError` */
	updateNoteFrontmatter: (absolutePath: string, mutate: (props: RawProperty[]) => RawProperty[]) => Promise<string>;
	typeDefinitionsStore: RawTypeDefinitionsStore;
	modCommandsStore: RawModCommandsStore;
	railRegistryStore: RawRailRegistryStore;
	settingsStore: RawSettingsStore;
	/** Opens the file when it exists (template ignored), else creates it from the template and opens it; rejects on failure */
	openOrCreateNote: (options: RawNoteCreationOptions) => Promise<void>;
	/** Saves a dirty open tab; `true` on success or nothing to do, `false` when the write failed (toast shown) */
	saveFileByPath: (absolutePath: string) => Promise<boolean>;
	/** Pushes text into an open tab (and the editor when active) without writing the file */
	syncExternalContentToEditor: (
		absolutePath: string,
		content: string,
		markSaved: boolean,
		schedule: 'frontmatter' | 'body' | 'none',
	) => void;
}

/** RAW. A link in the index; `path` is absolute */
export interface RawKbLink {
	path: string;
	display: string;
}

/** RAW. A task of a note */
export interface RawKbTask {
	/** Text without the checkbox */
	text: string;
	/** True for any checkbox character but a space, so `[/]` and `[>]` count */
	completed: boolean;
	/** 1-based line */
	line: number;
	/** Absolute path of the note */
	path: string;
}

/** RAW. A note of the index. Frontmatter keys sit on the page itself (`page.status`), not under a `frontmatter` key */
export interface RawKbPage {
	file: {
		/** Absolute path */
		path: string;
		/** File name with extension */
		name: string;
		basename: string;
		/** Absolute parent folder */
		folder: string;
		link: RawKbLink;
		tags: string[];
		inlinks: RawKbLink[];
		outlinks: RawKbLink[];
		/** Bytes */
		size: number;
		/** Milliseconds */
		ctime: number;
		/** Milliseconds */
		mtime: number;
		tasks: RawKbTask[];
	};
	/** From `_organized` */
	organized: boolean;
	/** From `_archived`; archived notes are pages too */
	archived: boolean;
	/** From `_favorite` */
	favorite: boolean;
	/** Frontmatter properties, plus `tags`, `_type` and the relationship keys */
	[property: string]: unknown;
}

/** RAW. A QueryJS DataArray, the common members only (see help/documentation/13-queryjs.md) */
export interface RawDataArray<T> {
	readonly length: number;
	where: (predicate: (item: T) => boolean) => RawDataArray<T>;
	filter: (predicate: (item: T) => boolean) => RawDataArray<T>;
	map: <U>(fn: (item: T, index: number) => U) => RawDataArray<U>;
	flatMap: <U>(fn: (item: T) => U[]) => RawDataArray<U>;
	sort: <U>(key?: (item: T) => U, direction?: 'asc' | 'desc') => RawDataArray<T>;
	groupBy: <K>(key: (item: T) => K) => RawDataArray<{ key: K; rows: RawDataArray<T> }>;
	limit: (n: number) => RawDataArray<T>;
	find: (predicate: (item: T) => boolean) => T | undefined;
	some: (predicate: (item: T) => boolean) => boolean;
	first: () => T | undefined;
	/** A plain array copy */
	array: () => T[];
	forEach: (fn: (item: T, index: number) => void) => void;
}

/**
 * RAW. What `await ctx.kb()` resolves to: a QueryJS `kb` over the app's
 * current index snapshot, which can lag a write by seconds. Only part of it is
 * typed. Scope every read to a folder or a limit: an unscoped read builds and
 * returns every note of the vault.
 */
export interface RawKb {
	readonly version: 1;
	/** Pages of a source: `'"Folder"'` (quotes required) or `'#tag'`; no source or an unparsed one means every page */
	pages: (source?: string) => RawDataArray<RawKbPage>;
	/** The page at an absolute path */
	page: (absolutePath: string) => RawKbPage | undefined;
	/** The page of the tab that was active when `ctx.kb()` was called */
	current: () => RawKbPage | null;
	/** A detached element the render helpers append to */
	readonly container: HTMLElement;
}

// ===========================================================================
// What onload receives, and the default export
// ===========================================================================

/** What a mod's `onload` receives: the stable contract plus the unstable `labs` and the raw `app` and `kb` */
export interface ModContext extends ModContextV1 {
	/** UNSTABLE. Experimental entry points */
	readonly labs: ModLabs;
	/** RAW. The app's live objects; reading it throws `Mod "<id>" is unloaded` after unload, objects already taken stay usable */
	readonly app: RawApp;
	/** RAW. Resolves to a QueryJS `kb`. Reading it throws `Mod "<id>" is unloaded` after unload; a call rejects with it when the unload comes during the snapshot read */
	readonly kb: () => Promise<RawKb>;
}

/** The default export of a mod's `main.js`, with the full context */
export interface Mod {
	/** Called once when the mod loads; may be async */
	onload: (ctx: ModContext) => unknown;
	/** Called once when the mod unloads, before the registered cleanups */
	onunload?: () => unknown;
}
