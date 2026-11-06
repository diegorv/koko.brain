import { readFileSync } from 'node:fs';
import { join } from 'node:path';
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

/** The path globs of the `fs:allow-read-text-file` permission. */
function fsReadScope(): string[] {
	const capability = readJson('src-tauri/capabilities/default.json') as { permissions: unknown[] };
	const permission = capability.permissions.find(
		(p): p is ScopedPermission =>
			typeof p === 'object' && p !== null && (p as ScopedPermission).identifier === 'fs:allow-read-text-file',
	);
	return permission?.allow.map((a) => a.path) ?? [];
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
