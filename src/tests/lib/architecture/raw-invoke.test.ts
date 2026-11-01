import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * `src/lib` and `src/routes` reach Rust commands through the typed `call()` in
 * `#lib/contracts/ipc.js`, never through a raw `invoke` import.
 */

const ROOT = process.cwd();
const SCANNED = ['src/lib', 'src/routes'];

/** Files allowed a raw `invoke`, with the reason. */
const ALLOWLIST = new Set([
	// The typed wrapper itself.
	'src/lib/contracts/ipc.ts',
	// `plugin:updater|download_and_install` is a plugin command outside CommandMap.
	'src/lib/core/settings/sections/UpdateSection.svelte',
]);

const CORE_MODULE = String.raw`'@tauri-apps\/api\/core'`;

/** An `import { ..., invoke, ... } from '@tauri-apps/api/core'` statement. */
const STATIC_NAMED_INVOKE = new RegExp(String.raw`import\s*\{[^}]*\binvoke\b[^}]*\}\s*from\s*` + CORE_MODULE);

/** An `import * as ns from '@tauri-apps/api/core'` statement: `ns.invoke` is reachable. */
const STATIC_NAMESPACE = new RegExp(String.raw`import\s*\*\s*as\s+\w+\s*from\s*` + CORE_MODULE);

/** Any dynamic `import('@tauri-apps/api/core')`. */
const DYNAMIC_IMPORT = new RegExp(String.raw`import\(\s*` + CORE_MODULE + String.raw`\s*\)`, 'g');

/**
 * The two dynamic shapes that bind only named exports, capturing the bindings:
 * `const { a } = await import(...)` and `import(...).then(({ a }) => ...)`.
 */
const DYNAMIC_DESTRUCTURED = new RegExp(
	String.raw`\{([^}]*)\}\s*=\s*await\s+import\(\s*` +
		CORE_MODULE +
		String.raw`\s*\)|import\(\s*` +
		CORE_MODULE +
		String.raw`\s*\)\s*\.then\(\s*\(\s*\{([^}]*)\}`,
	'g',
);

/**
 * True when the source can reach `invoke` from `@tauri-apps/api/core`: a named
 * or namespace import, or a dynamic import that is not destructured into
 * bindings free of `invoke`.
 */
function importsRawInvoke(src: string): boolean {
	if (STATIC_NAMED_INVOKE.test(src) || STATIC_NAMESPACE.test(src)) return true;
	const dynamicCount = src.match(DYNAMIC_IMPORT)?.length ?? 0;
	const safe = [...src.matchAll(DYNAMIC_DESTRUCTURED)].filter(
		(m) => !/\binvoke\b/.test(m[1] ?? m[2] ?? ''),
	).length;
	return dynamicCount > safe;
}

function scannedFiles(): string[] {
	return SCANNED.flatMap((dir) =>
		readdirSync(join(ROOT, dir), { recursive: true, encoding: 'utf8' })
			.filter((f) => /\.(ts|js|svelte)$/.test(f))
			.map((f) => relative(ROOT, join(ROOT, dir, f))),
	);
}

describe('IPC goes through call()', () => {
	it('no file under src/lib or src/routes imports invoke, outside the allowlist', () => {
		const offenders = scannedFiles().filter(
			(f) => !ALLOWLIST.has(f) && importsRawInvoke(readFileSync(join(ROOT, f), 'utf8')),
		);
		expect(offenders).toEqual([]);
	});

	it('every allowlisted file still imports invoke', () => {
		const stale = [...ALLOWLIST].filter(
			(f) => !importsRawInvoke(readFileSync(join(ROOT, f), 'utf8')),
		);
		expect(stale).toEqual([]);
	});

	it('matches the raw import shapes it guards against', () => {
		expect(importsRawInvoke("import { invoke } from '@tauri-apps/api/core';")).toBe(true);
		expect(importsRawInvoke("import { invoke, Channel } from '@tauri-apps/api/core';")).toBe(true);
		expect(importsRawInvoke("import * as core from '@tauri-apps/api/core';")).toBe(true);
		expect(importsRawInvoke("const { invoke } = await import('@tauri-apps/api/core');")).toBe(true);
		expect(
			importsRawInvoke("import('@tauri-apps/api/core').then(({ invoke }) => invoke('x'));"),
		).toBe(true);
		expect(importsRawInvoke("const core = await import('@tauri-apps/api/core');")).toBe(true);
		expect(importsRawInvoke("import('@tauri-apps/api/core').then((m) => m.invoke('x'));")).toBe(true);
	});

	it('lets imports that bind only other exports through', () => {
		expect(importsRawInvoke("import { convertFileSrc } from '@tauri-apps/api/core';")).toBe(false);
		expect(importsRawInvoke("const { convertFileSrc } = await import('@tauri-apps/api/core');")).toBe(
			false,
		);
		expect(
			importsRawInvoke("import('@tauri-apps/api/core')\n\t.then(({ convertFileSrc }) => convertFileSrc(p));"),
		).toBe(false);
	});
});
