import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The asset protocol (`convertFileSrc`, every embedded image) has its own scope in
 * `tauri.conf.json`, separate from the fs capability scope in `capabilities/default.json`.
 * Every vault root the fs plugin may read must also be servable as an asset, or images in
 * that vault silently fail to load.
 */

const ROOT = process.cwd();

/** One entry of a capability's `allow` list. */
interface AllowEntry {
	path: string;
}

/** A scoped permission in `capabilities/default.json`. */
interface ScopedPermission {
	identifier: string;
	allow: AllowEntry[];
}

/** Reads a JSON file relative to the repo root. */
function readJson(path: string): unknown {
	return JSON.parse(readFileSync(join(ROOT, path), 'utf8'));
}

/** The path globs of a scoped permission in `capabilities/default.json`, empty when absent. */
function permissionScope(identifier: string): string[] {
	const capability = readJson('src-tauri/capabilities/default.json') as { permissions: unknown[] };
	const permission = capability.permissions.find(
		(p): p is ScopedPermission =>
			typeof p === 'object' && p !== null && (p as ScopedPermission).identifier === identifier,
	);
	return permission?.allow.map((a) => a.path) ?? [];
}

/** The path globs of the `fs:allow-read-text-file` permission. */
function fsReadScope(): string[] {
	return permissionScope('fs:allow-read-text-file');
}

/** The globs of `app.security.assetProtocol.scope`. */
function assetScope(): string[] {
	const config = readJson('src-tauri/tauri.conf.json') as {
		app: { security: { assetProtocol: { scope: string[] } } };
	};
	return config.app.security.assetProtocol.scope;
}

/**
 * Whether a glob of literal and `**` segments matches a path, split on `/`. Models Tauri's
 * default `requireLiteralLeadingDot` on Unix: `**` never matches a segment starting with `.`,
 * so `$DOCUMENT/**` does not reach `.kokobrain` folders.
 */
function globMatches(pattern: string[], path: string[]): boolean {
	if (pattern.length === 0) return path.length === 0;
	const [head, ...rest] = pattern;
	if (head === '**') {
		return globMatches(rest, path) || (path.length > 0 && !path[0].startsWith('.') && globMatches(pattern, path.slice(1)));
	}
	return path.length > 0 && head === path[0] && globMatches(rest, path.slice(1));
}

/** Whether some asset-scope glob serves the files an fs glob names (each `**` as `a/b`). */
function isCovered(fsGlob: string, scope: string[]): boolean {
	const sample = fsGlob.replaceAll('**', 'a/b').split('/');
	return scope.some((glob) => globMatches(glob.split('/'), sample));
}

describe('mod vault deletion capability', () => {
	it('allows stat in the main window only within the supported vault locations', () => {
		const capability = readJson('src-tauri/capabilities/default.json') as {
			windows: string[];
			permissions: (string | ScopedPermission)[];
		};
		expect(capability.windows).toContain('main');
		const permissions = capability.permissions.filter(
			(p) => (typeof p === 'string' ? p : p.identifier) === 'fs:allow-stat',
		);
		expect(permissions).toEqual([
			{
				identifier: 'fs:allow-stat',
				allow: [
					{ path: '$DOCUMENT/kokobrain-vaults/**' },
					{ path: '$DOCUMENT/kokobrain-vaults/**/.kokobrain/**' },
					{ path: '$HOME/kokobrain-vaults/**' },
					{ path: '$HOME/kokobrain-vaults/**/.kokobrain/**' },
				],
			},
		]);
	});
});

describe('asset protocol scope', () => {
	it('serves every vault root the fs plugin may read', () => {
		const fsScope = fsReadScope();
		expect(fsScope).toContain('$HOME/kokobrain-vaults/**');
		expect(fsScope).toContain('$DOCUMENT/kokobrain-vaults/**');
		const scope = assetScope();
		const uncovered = fsScope.filter((glob) => !isCovered(glob, scope));
		expect(uncovered).toEqual([]);
	});

	it('does not let ** reach a hidden folder or a sibling root', () => {
		expect(isCovered('$DOCUMENT/kokobrain-vaults/**', ['$DOCUMENT/**'])).toBe(true);
		expect(isCovered('$DOCUMENT/kokobrain-vaults/**/.kokobrain/**', ['$DOCUMENT/**'])).toBe(false);
		expect(isCovered('$DOCUMENT/kokobrain-vaults/**/.kokobrain/**', ['$DOCUMENT/**/.kokobrain/**'])).toBe(true);
		expect(isCovered('$HOME/kokobrain-vaults/**', ['$HOME/kokobrain-vault/**'])).toBe(false);
		expect(isCovered('$HOME/kokobrain-vaults/**', [])).toBe(false);
	});
});

/**
 * Every vitest file mocks `@tauri-apps/plugin-fs`, so a call the capability does not grant
 * passes every test and is rejected only in the app. Each plugin-fs function imported under
 * `src/lib` or `src/routes` must map to a permission granted in `capabilities/default.json`.
 */
describe('plugin-fs imports are granted', () => {
	/** plugin-fs function name to the permission that grants its command. */
	const FS_PERMISSIONS: Record<string, string> = {
		copyFile: 'fs:allow-copy-file',
		exists: 'fs:allow-exists',
		mkdir: 'fs:allow-mkdir',
		readDir: 'fs:allow-read-dir',
		readFile: 'fs:allow-read-file',
		readTextFile: 'fs:allow-read-text-file',
		remove: 'fs:allow-remove',
		rename: 'fs:allow-rename',
		stat: 'fs:allow-stat',
		writeTextFile: 'fs:allow-write-text-file',
	};

	/** A static named import from `@tauri-apps/plugin-fs`, capturing the braces' contents. */
	const PLUGIN_FS_IMPORT = /import\s*\{([^}]*)\}\s*from\s*'@tauri-apps\/plugin-fs'/g;

	/** The plugin-fs value names imported by a source file (`type` imports and aliases resolved). */
	function importedNames(src: string): string[] {
		return [...src.matchAll(PLUGIN_FS_IMPORT)].flatMap((m) =>
			m[1]
				.split(',')
				.map((part) => part.trim())
				.filter((part) => part !== '' && !part.startsWith('type '))
				.map((part) => part.split(/\s+as\s+/)[0]),
		);
	}

	/** Every `.ts`, `.js` and `.svelte` file under `src/lib` and `src/routes`, as [path, source]. */
	function sourceFiles(): [string, string][] {
		return ['src/lib', 'src/routes'].flatMap((dir) =>
			readdirSync(join(ROOT, dir), { recursive: true, encoding: 'utf8' })
				.filter((f) => /\.(ts|js|svelte)$/.test(f))
				.map((f): [string, string] => {
					const path = relative(ROOT, join(ROOT, dir, f));
					return [path, readFileSync(join(ROOT, path), 'utf8')];
				}),
		);
	}

	/** Every plugin-fs name imported under `src/lib` and `src/routes`, with the files importing it. */
	function importsByName(): Map<string, string[]> {
		const byName = new Map<string, string[]>();
		for (const [path, src] of sourceFiles()) {
			for (const name of importedNames(src)) {
				byName.set(name, [...(byName.get(name) ?? []), path]);
			}
		}
		return byName;
	}

	/** The identifiers of every permission in `capabilities/default.json`, string or scoped. */
	function grantedIdentifiers(): string[] {
		const capability = readJson('src-tauri/capabilities/default.json') as {
			permissions: (string | ScopedPermission)[];
		};
		return capability.permissions.map((p) => (typeof p === 'string' ? p : p.identifier));
	}

	it('finds the plugin-fs imports it checks', () => {
		const names = [...importsByName().keys()];
		expect(names).toContain('readTextFile');
		expect(names).toContain('readFile');
	});

	it('parses every @tauri-apps/plugin-fs mention as a static named import', () => {
		// A namespace import, a dynamic import() or a double-quoted specifier would skip the
		// grant check above, so any mention the import regex does not parse fails here.
		const unparsed = sourceFiles()
			.filter(
				([, src]) =>
					src.split('@tauri-apps/plugin-fs').length - 1 !== [...src.matchAll(PLUGIN_FS_IMPORT)].length,
			)
			.map(([path]) => path);
		expect(unparsed).toEqual([]);
	});

	it('maps every imported plugin-fs function to a permission', () => {
		const unmapped = [...importsByName()].filter(([name]) => !(name in FS_PERMISSIONS));
		expect(unmapped).toEqual([]);
	});

	it('grants the permission of every imported plugin-fs function', () => {
		const granted = new Set(grantedIdentifiers());
		const missing = [...importsByName().keys()]
			.filter((name) => name in FS_PERMISSIONS && !granted.has(FS_PERMISSIONS[name]))
			.map((name) => `${name} -> ${FS_PERMISSIONS[name]}`);
		expect(missing).toEqual([]);
	});

	it('scopes fs:allow-read-file exactly like fs:allow-read-text-file', () => {
		expect(permissionScope('fs:allow-read-file')).toEqual(permissionScope('fs:allow-read-text-file'));
		expect(permissionScope('fs:allow-read-file')).toEqual([
			'$DOCUMENT/kokobrain-vaults/**',
			'$DOCUMENT/kokobrain-vaults/**/.kokobrain/**',
			'$HOME/kokobrain-vaults/**',
			'$HOME/kokobrain-vaults/**/.kokobrain/**',
		]);
	});

	it('reads value names and skips type-only parts of an import', () => {
		expect(
			importedNames("import { readFile as rf, type DirEntry, exists } from '@tauri-apps/plugin-fs';"),
		).toEqual(['readFile', 'exists']);
		expect(importedNames("import { readFile } from '@tauri-apps/plugin-dialog';")).toEqual([]);
	});
});
