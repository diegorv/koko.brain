import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The frontend subscribes to Tauri events through the typed `on()` in
 * `#lib/contracts/ipc.js`, never through a raw `listen` / `once` import from
 * `@tauri-apps/api/event`, so every event name and payload type comes from
 * `EventMap`.
 */

const ROOT = process.cwd();
const SCANNED = ['src/lib', 'src/routes'];

/** Files allowed a raw `listen` / `once`, with the reason. */
const ALLOWLIST = new Set([
	// The typed `on()` wrapper itself.
	'src/lib/contracts/ipc.ts',
]);

/** The module specifier, in either quote style. */
const EVENT_MODULE = String.raw`['"]@tauri-apps\/api\/event['"]`;

/** The raw subscribe functions `on()` replaces. */
const RAW = /\b(?:listen|once)\b/;

/**
 * An `import { ... }` or re-export `export { ... }` from
 * `@tauri-apps/api/event`, capturing the bindings.
 */
const STATIC_NAMED = new RegExp(String.raw`(?:import|export)\s*\{([^}]*)\}\s*from\s*` + EVENT_MODULE, 'g');

/** An `import * as ns from '@tauri-apps/api/event'` statement: `ns.listen` is reachable. */
const STATIC_NAMESPACE = new RegExp(String.raw`import\s*\*\s*as\s+\w+\s*from\s*` + EVENT_MODULE);

/** Any dynamic `import('@tauri-apps/api/event')`. */
const DYNAMIC_IMPORT = new RegExp(String.raw`import\(\s*` + EVENT_MODULE + String.raw`\s*\)`, 'g');

/**
 * The two dynamic shapes that bind only named exports, capturing the bindings:
 * `const { a } = await import(...)` and `import(...).then(({ a }) => ...)`.
 */
const DYNAMIC_DESTRUCTURED = new RegExp(
	String.raw`\{([^}]*)\}\s*=\s*await\s+import\(\s*` +
		EVENT_MODULE +
		String.raw`\s*\)|import\(\s*` +
		EVENT_MODULE +
		String.raw`\s*\)\s*\.then\(\s*\(\s*\{([^}]*)\}`,
	'g',
);

/**
 * True when the source can reach `listen` or `once` from
 * `@tauri-apps/api/event`: a named or namespace import, or a dynamic import
 * that is not destructured into bindings free of them.
 */
function importsRawListen(src: string): boolean {
	if ([...src.matchAll(STATIC_NAMED)].some((m) => RAW.test(m[1]))) return true;
	if (STATIC_NAMESPACE.test(src)) return true;
	const dynamicCount = src.match(DYNAMIC_IMPORT)?.length ?? 0;
	const safe = [...src.matchAll(DYNAMIC_DESTRUCTURED)].filter(
		(m) => !RAW.test(m[1] ?? m[2] ?? ''),
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

describe('event listeners go through on()', () => {
	it('no file under src/lib or src/routes imports listen, outside the allowlist', () => {
		const offenders = scannedFiles().filter(
			(f) => !ALLOWLIST.has(f) && importsRawListen(readFileSync(join(ROOT, f), 'utf8')),
		);
		expect(offenders).toEqual([]);
	});

	it('every allowlisted file still imports listen', () => {
		const stale = [...ALLOWLIST].filter(
			(f) => !importsRawListen(readFileSync(join(ROOT, f), 'utf8')),
		);
		expect(stale).toEqual([]);
	});

	it('matches the raw import shapes it guards against', () => {
		expect(importsRawListen("import { listen } from '@tauri-apps/api/event';")).toBe(true);
		expect(importsRawListen("import { listen, type UnlistenFn } from '@tauri-apps/api/event';")).toBe(
			true,
		);
		expect(importsRawListen("import { once } from '@tauri-apps/api/event';")).toBe(true);
		expect(importsRawListen("import * as event from '@tauri-apps/api/event';")).toBe(true);
		expect(importsRawListen("const { listen } = await import('@tauri-apps/api/event');")).toBe(true);
		expect(
			importsRawListen("import('@tauri-apps/api/event').then(({ listen }) => listen('x', f));"),
		).toBe(true);
		expect(importsRawListen("const event = await import('@tauri-apps/api/event');")).toBe(true);
		expect(importsRawListen('import { listen } from "@tauri-apps/api/event";')).toBe(true);
		expect(importsRawListen("export { listen } from '@tauri-apps/api/event';")).toBe(true);
	});

	it('lets imports that bind only other exports through', () => {
		expect(importsRawListen("import type { UnlistenFn } from '@tauri-apps/api/event';")).toBe(false);
		expect(importsRawListen("import { emit } from '@tauri-apps/api/event';")).toBe(false);
		expect(importsRawListen("const { emit } = await import('@tauri-apps/api/event');")).toBe(false);
		expect(importsRawListen("import { listen } from '@tauri-apps/api/core';")).toBe(false);
	});
});
