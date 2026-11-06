import type { ModV1 } from './contract/mod-api.v1';

/** Vault-relative folder that holds one subfolder per mod (PRD P2: fixed, ignores `templates.systemFolder`) */
export const MODS_DIR = '_system/mods';

/**
 * Vault-relative folder that holds one data folder per mod. A dot-folder: the
 * watcher and the vault scans skip it (Indexing rule 5), so a save reaches
 * neither the index nor the file tree.
 */
export const MOD_DATA_DIR = '.kokobrain/mods';

/** The files of a mod whose change reloads it */
const MOD_FILES = ['manifest.json', 'main.js'];

/** What a watcher batch asks of the mods host */
export interface ModChanges {
	/** The mods folder or one of its ancestors inside the vault changed: list the folders again and reload all */
	rediscover: boolean;
	/** Mod folders to reload, each once, sorted */
	folders: string[];
}

/**
 * Maps the absolute paths of a watcher batch to the mods to reload. A path is
 * the mods folder or one of its ancestors below the vault root (`_system`
 * renamed can arrive as that path alone): rediscover. A mod folder (a deletion
 * often arrives as the folder alone, since the Rust watcher keeps only the
 * deepest paths) or a `manifest.json` / `main.js` directly inside one: that
 * folder. Anything else is ignored. A single name with a `.` directly in the
 * mods folder is a file, not a mod: a mod id has no `.`. So a folder whose
 * name has a `.` (listed only as an error at start) is not reloaded, and its
 * error row stays after it is deleted until the next start or rediscover.
 */
export function mapModChanges(paths: string[], vaultPath: string): ModChanges {
	const modsPath = `${vaultPath}/${MODS_DIR}`;
	let rediscover = false;
	const folders = new Set<string>();
	for (const path of paths) {
		if (path === modsPath || (path.startsWith(`${vaultPath}/`) && modsPath.startsWith(`${path}/`))) {
			rediscover = true;
			continue;
		}
		if (!path.startsWith(`${modsPath}/`)) continue;
		const segments = path.slice(modsPath.length + 1).split('/');
		if (segments.length === 1 && !segments[0].includes('.')) folders.add(segments[0]);
		else if (segments.length === 2 && MOD_FILES.includes(segments[1])) folders.add(segments[0]);
	}
	return { rediscover, folders: [...folders].sort() };
}

/**
 * Whether an absolute watcher path is mod code: a file under the vault's mods
 * folder that is not a note (`.md`, `.markdown`) or a view (`.view`). The
 * watcher handler leaves these out of the index rebuild, and `ctx.vault.write`
 * skips the after-save path for them. False with no vault.
 */
export function isModCodePath(path: string, vaultPath: string | null): boolean {
	if (vaultPath === null || !path.startsWith(`${vaultPath}/${MODS_DIR}/`)) return false;
	return !(path.endsWith('.md') || path.endsWith('.markdown') || path.endsWith('.view'));
}

/**
 * Throws `Invalid vault path "<path>"` unless `path` is a vault-relative
 * path: split on `/`, no empty path, no leading `/`, and no empty, `.` or
 * `..` segment (so no trailing or double slash). Hygiene against a mod's
 * typo, not a security boundary: mods run with full trust.
 */
export function assertVaultPath(path: unknown): asserts path is string {
	const valid =
		typeof path === 'string' && path !== '' && path.split('/').every((s) => s !== '' && s !== '.' && s !== '..');
	if (!valid) throw new Error(`Invalid vault path "${String(path)}"`);
}

/** Why JSON cannot represent `value`, or null when it can; an `undefined` object property reads back the same, so it can */
function unrepresentable(value: unknown, inArray: boolean): string | null {
	if (typeof value === 'function' || typeof value === 'symbol') return typeof value;
	if (typeof value === 'number' && !Number.isFinite(value)) return String(value);
	if (value === undefined && inArray) return 'undefined';
	if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
	const proto = Object.getPrototypeOf(value);
	return proto === Object.prototype || proto === null ? null : `a ${(value as object).constructor?.name ?? 'class instance'}`;
}

/**
 * A mod's data as readable JSON with a final newline. Throws, saying what and
 * where, on what `JSON.stringify` would otherwise change without a word: `NaN`
 * or `Infinity` become `null`, a `Map` or a class instance `{}`, and a function
 * disappears. A cycle or a `BigInt` throws from `JSON.stringify` itself.
 */
export function serializeModData(value: unknown): string {
	const text = JSON.stringify(
		value,
		function (this: unknown, key: string, current: unknown) {
			const problem = unrepresentable(current, Array.isArray(this));
			if (problem !== null) throw new Error(key === '' ? problem : `${problem} at "${key}"`);
			return current;
		},
		'\t',
	);
	if (text === undefined) throw new Error('undefined');
	return `${text}\n`;
}

/**
 * The bytes of a mod's `data.json` as a value. `ok: false` on invalid UTF-8 as
 * well as invalid JSON: a lossy decode could parse, and the next save would
 * then replace the bytes it dropped.
 */
export function parseModData(bytes: number[]): { ok: true; value: unknown } | { ok: false } {
	try {
		return { ok: true, value: JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(bytes))) };
	} catch {
		return { ok: false };
	}
}

/**
 * A thrown value as one string for `debug()`: the message, then the stack.
 * The log file JSON-stringifies non-string arguments, which turns an `Error`
 * into `{}`; the message comes first because a WKWebView stack omits it.
 */
export function errorText(err: unknown): string {
	if (!(err instanceof Error)) return String(err);
	return err.stack ? `${err.message}\n${err.stack}` : err.message;
}

/**
 * Whether the run view closes by itself: a run that ended done without a log
 * line or a progress call left nothing to read. A run that logged or showed
 * progress, failed, or was cancelled stays open until the user closes it.
 */
export function closesWhenDone(run: { status: string; lines: readonly string[]; progress: unknown }): boolean {
	return run.status === 'done' && run.lines.length === 0 && run.progress === null;
}

/** A validated `manifest.json`; unknown keys are dropped */
export interface ModManifest {
	/** Equal to the mod's folder name */
	id: string;
	/** Display name */
	name: string;
	/** Free-form version string */
	version: string;
	/** Optional one-line description */
	description?: string;
	/** Optional author */
	author?: string;
	/** Optional minimum app version, shape-checked but not enforced */
	minAppVersion?: string;
	/** Optional icon color of all the mod's rail buttons, one hex value per theme mode */
	color?: { light: string; dark: string };
}

/** Result of `parseModManifest`: the manifest, or an error naming the folder and the field */
export type ModManifestResult = { ok: true; manifest: ModManifest } | { ok: false; error: string };

const MOD_ID_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const MOD_ID_MAX_LENGTH = 64;
const MIN_APP_VERSION_PATTERN = /^\d+\.\d+\.\d+$/;
/** Hex only: a color reaches an inline style */
const HEX_COLOR_PATTERN = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

/**
 * Validates the text of `_system/mods/<folder>/manifest.json`. Every error
 * starts with `_system/mods/<folder>: manifest.json` and names the field.
 */
export function parseModManifest(text: string, folder: string): ModManifestResult {
	const fail = (message: string): ModManifestResult => ({
		ok: false,
		error: `${MODS_DIR}/${folder}: manifest.json ${message}`,
	});

	let raw: unknown;
	try {
		raw = JSON.parse(text);
	} catch {
		return fail('is not valid JSON');
	}
	if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return fail('must be a JSON object');
	const fields = raw as Record<string, unknown>;

	const { id, name, version, description, author, minAppVersion, color } = fields;
	if (typeof id !== 'string') return fail('id must be a string');
	if (id.length > MOD_ID_MAX_LENGTH) return fail(`id must be at most ${MOD_ID_MAX_LENGTH} characters`);
	if (!MOD_ID_PATTERN.test(id)) {
		return fail(`id "${id}" must be lowercase letters and digits, joined by single hyphens`);
	}
	if (id !== folder) return fail(`id "${id}" does not match the folder name`);
	if (typeof name !== 'string' || name === '') return fail('name must be a non-empty string');
	if (typeof version !== 'string' || version === '') return fail('version must be a non-empty string');
	if (description !== undefined && typeof description !== 'string') return fail('description must be a string');
	if (author !== undefined && typeof author !== 'string') return fail('author must be a string');
	if (minAppVersion !== undefined && (typeof minAppVersion !== 'string' || !MIN_APP_VERSION_PATTERN.test(minAppVersion))) {
		return fail('minAppVersion must look like 1.2.3');
	}

	const manifest: ModManifest = { id, name, version };
	if (description !== undefined) manifest.description = description;
	if (author !== undefined) manifest.author = author;
	if (minAppVersion !== undefined) manifest.minAppVersion = minAppVersion;
	if (color !== undefined) {
		if (typeof color !== 'object' || color === null || Array.isArray(color)) {
			return fail('color must be an object with light and dark');
		}
		const { light, dark } = color as Record<string, unknown>;
		if (typeof light !== 'string' || !HEX_COLOR_PATTERN.test(light)) return fail('color.light must be a hex color like #d946ef');
		if (typeof dark !== 'string' || !HEX_COLOR_PATTERN.test(dark)) return fail('color.dark must be a hex color like #d946ef');
		manifest.color = { light, dark };
	}
	return { ok: true, manifest };
}

const EXPORT_DEFAULT = /^export\s+default\s+/m;
const EXPORT_DEFAULT_ALL = /^export\s+default\s+/gm;
/** Parameter name the rewritten `export default` assigns to; unlikely to collide with mod code */
const EXPORTS_HOLDER = '__kokobrainModExports';
const IMPORT_EXPORT_MESSAGE = 'main.js: use exactly one "export default" and no "import"; a mod is one file';

/**
 * Evaluates a mod's `main.js` and returns its default export (PRD P3).
 *
 * The single top-level `export default` becomes an assignment to a holder
 * object, and the code runs in strict mode through `new Function` with a
 * `kokobrain-mods/<id>/main.js` sourceURL. Any other `import` / `export` is a
 * SyntaxError from the engine, reworded as the one-file rule. Unlike QueryJS
 * there is no `await` sniffing: the text is never wrapped in an async function.
 * Running the mod's code is the point (full trust, PRD); `id` goes into the
 * sourceURL comment, so pass only an id `parseModManifest` accepted.
 *
 * Throws on zero or several `export default` lines, on a syntax error, on an
 * error thrown by the top-level code, and on a default export without `onload`.
 */
export function evaluateModSource(source: string, id: string): ModV1 {
	const count = source.match(EXPORT_DEFAULT_ALL)?.length ?? 0;
	if (count === 0) throw new Error('main.js: found no "export default"; a mod default-exports an object with onload');
	if (count > 1) throw new Error(`main.js: found ${count} "export default" lines; use exactly one`);

	const body = source.replace(EXPORT_DEFAULT, `${EXPORTS_HOLDER}.default = `);
	let run: (holder: { default?: unknown }) => void;
	try {
		// Same line as the code so stack line numbers stay close to the file's.
		run = new Function(EXPORTS_HOLDER, `"use strict";${body}\n//# sourceURL=kokobrain-mods/${id}/main.js`) as typeof run;
	} catch (err) {
		if (err instanceof SyntaxError && /\b(import|export)\b/.test(err.message)) {
			throw new SyntaxError(IMPORT_EXPORT_MESSAGE);
		}
		throw err;
	}

	const holder: { default?: unknown } = {};
	run(holder);
	const mod = holder.default;
	if (typeof mod !== 'object' || mod === null || typeof (mod as { onload?: unknown }).onload !== 'function') {
		throw new Error('main.js: the default export must be an object with an onload function');
	}
	return mod as ModV1;
}
