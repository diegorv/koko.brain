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

/** A rail button a mod adds with `ctx.addRailButton`; a click opens a picker of its actions */
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
}

/** The app's workspace, for a mod */
export interface ModWorkspaceV1 {
	/** Opens the note at a vault-relative path in the editor, or switches to its tab; rejects when the note does not exist */
	openNote: (path: string) => Promise<void>;
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
	/** Reads and writes vault files by vault-relative path */
	vault: ModVaultV1;
	/** Opens notes */
	workspace: ModWorkspaceV1;
}

/** The default export of a mod's `main.js` */
export interface ModV1 {
	/** Called once when the mod loads; may be async */
	onload: (ctx: ModContextV1) => unknown;
	/** Called once when the mod unloads, before the registered cleanups */
	onunload?: () => unknown;
}
