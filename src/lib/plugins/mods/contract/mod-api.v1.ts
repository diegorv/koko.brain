/**
 * Vault mods API, contract version 1: what a mod's `main.js` default export
 * implements and the `ctx` its `onload` receives. Hand-written so it
 * constrains the host instead of following it; `../mods-host.service.ts`
 * builds `ctx` against these interfaces.
 *
 * Rules for editing this file:
 * - Members are function-typed properties, never method signatures: methods
 *   are checked bivariantly, so a parameter made required or a narrowed union
 *   would still satisfy the interface.
 * - It imports nothing. In particular not `#lib/types/`, `#lib/features/` or
 *   generated IPC bindings, whose changes must not reach mods.
 * - It is a `.ts` file, not a `.d.ts`: `skipLibCheck` would skip type errors
 *   inside a declaration file.
 * - Compatibility: a new `ModContextV1` member is additive; removing or
 *   changing a member is a major change that bumps `apiVersion`.
 *   `src/tests/lib/plugins/mods/mod-api-contract.test.ts` freezes the surface.
 */

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
}

/** An action a mod adds with `ctx.addAction`; its rail buttons list it in their picker */
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
	/** Adds a rail button; throws on a duplicate id. Returns a disposer; it is also removed at unload */
	addRailButton: (button: ModRailButtonV1) => () => void;
	/**
	 * Tracks `read` and calls `onChange` only when its value changes by Object.is,
	 * not at subscription. Both failures go to the mod's debug log. The handler
	 * is untracked. Returns a disposer; it is also removed at unload.
	 */
	watch: <T>(read: () => T, onChange: (value: T) => void) => () => void;
	/**
	 * Reports a saved note's vault-relative path in a later timer, after the
	 * synchronous save observers. Callback failures go to the mod's debug log.
	 * Returns a disposer; unload also unsubscribes and cancels pending callbacks.
	 * Writing again with vault.write can loop; switching off the mod in Labs stops it.
	 */
	onNoteSaved: (callback: (path: string) => void) => () => void;
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
	 * index, search, file history and Auto Move. Calls land in order, so the last
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
