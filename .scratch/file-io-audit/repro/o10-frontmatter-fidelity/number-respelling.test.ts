import { describe, it, expect, vi, beforeEach } from 'vitest';

const disk = new Map<string, string>();

vi.mock('@tauri-apps/plugin-fs', () => ({
	readTextFile: vi.fn(async (p: string) => {
		if (!disk.has(p)) throw new Error(`No such file: ${p}`);
		return disk.get(p)!;
	}),
	writeTextFile: vi.fn(async (p: string, c: string, opts?: { create?: boolean }) => {
		if (!disk.has(p) && opts?.create === false) throw new Error(`failed to open file at path: ${p}`);
		disk.set(p, c);
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

const NOTE = '/vault/contact.md';
const ORIGINAL = '---\nzip: 01234\nversion: 1.10\nratio: 1.0\nh: 0x1F\n---\nBody\n';

describe('repro o10 fidelity-7: a frontmatter rewrite keeps how numbers are spelled', () => {
	beforeEach(() => {
		disk.clear();
		resetEditor();
	});

	it('sidebar favorite on a closed note does not change zip/version/ratio/h', async () => {
		disk.set(NOTE, ORIGINAL);
		await toggleFavoriteForPath(NOTE, true);

		const written = disk.get(NOTE)!;
		expect(written).toContain('_favorite: true');
		for (const line of ['zip: 01234', 'version: 1.10', 'ratio: 1.0', 'h: 0x1F']) {
			expect(written, written).toContain(line);
		}
	});
});
