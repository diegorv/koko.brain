import type { ModV1 } from './contract/mod-api.v1';

/** Vault-relative folder that holds one subfolder per mod (PRD P2: fixed, ignores `templates.systemFolder`) */
export const MODS_DIR = '_system/mods';

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
}

/** Result of `parseModManifest`: the manifest, or an error naming the folder and the field */
export type ModManifestResult = { ok: true; manifest: ModManifest } | { ok: false; error: string };

const MOD_ID_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const MOD_ID_MAX_LENGTH = 64;
const MIN_APP_VERSION_PATTERN = /^\d+\.\d+\.\d+$/;

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

	const { id, name, version, description, author, minAppVersion } = fields;
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
