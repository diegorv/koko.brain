import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Byte-level fake disk. `readTextFile` / `writeTextFile` mirror the guest-js of
 * tauri-plugin-fs fs-v2.7.1 (plugins/fs/guest-js/index.ts): the read decodes
 * the raw bytes with `new TextDecoder('utf-8')` (not fatal, so invalid bytes
 * become U+FFFD) and the write encodes with `new TextEncoder()` (UTF-8).
 */
const disk = new Map<string, Uint8Array>();

vi.mock('@tauri-apps/plugin-fs', () => ({
	readTextFile: vi.fn(async (p: string) => {
		const bytes = disk.get(p);
		if (!bytes) throw new Error(`No such file: ${p}`);
		return new TextDecoder('utf-8').decode(bytes);
	}),
	writeTextFile: vi.fn(async (p: string, c: string, opts?: { create?: boolean }) => {
		if (!disk.has(p) && opts?.create === false) throw new Error(`failed to open file at path: ${p}`);
		disk.set(p, new TextEncoder().encode(c));
	}),
	exists: vi.fn(async (p: string) => disk.has(p)),
}));

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(async () => undefined),
}));

vi.mock('svelte-sonner', () => ({
	toast: { error: vi.fn(), success: vi.fn() },
}));

import { toggleFavoriteForPath } from '#lib/features/properties/lifecycle.service.js';
import { resetEditor } from '#lib/core/editor/editor.service.js';

const NOTE = '/vault/legacy.md';

/** ISO-8859-1 bytes of `---\ntitle: Caf<e9>\n---\nRésumé body\n` (é = 0xE9). */
function latin1(text: string): Uint8Array {
	return Uint8Array.from([...text].map((c) => c.charCodeAt(0)));
}

describe('repro o10 fidelity-8: a non-UTF-8 note is never rewritten with U+FFFD', () => {
	beforeEach(() => {
		disk.clear();
		resetEditor();
	});

	it('sidebar favorite on a Latin-1 note keeps the original 0xE9 bytes (or refuses)', async () => {
		const original = latin1('---\ntitle: Café\n---\nRésumé body\n');
		disk.set(NOTE, original);

		await toggleFavoriteForPath(NOTE, true);

		const after = disk.get(NOTE)!;
		const hex = Buffer.from(after).toString('hex');
		// EF BF BD is U+FFFD encoded as UTF-8: the accented letters are gone.
		expect(hex.includes('efbfbd'), Buffer.from(after).toString('utf8')).toBe(false);
	});
});
