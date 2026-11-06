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

/** An action a mod adds with `ctx.addAction`; its rail buttons list it in their picker */
export interface ModActionV1 {
	/** Unique within the mod */
	id: string;
	/** Picker row title, also named in the error toast when `run` fails */
	title: string;
	/** Picker row subtitle */
	description?: string;
	/** Runs the action; may be async. A throw or rejection shows an error toast */
	run: () => unknown;
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
}

/** The default export of a mod's `main.js` */
export interface ModV1 {
	/** Called once when the mod loads; may be async */
	onload: (ctx: ModContextV1) => unknown;
	/** Called once when the mod unloads, before the registered cleanups */
	onunload?: () => unknown;
}
