/**
 * F43: duplicateItem on a case-insensitive volume (macOS APFS default).
 * The fs mock below behaves like APFS: names are stored with their casing but
 * looked up case-insensitively, and copyFile truncates an existing target like
 * std::fs::copy does (tauri-plugin-fs 2.7.1 commands.rs:393).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupLocalStorage } from '../../fixtures/localStorage.fixture';

setupLocalStorage();

const disk = new Map<string, { name: string; content: string }>();
const key = (p: string) => p.toLowerCase();

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));
vi.mock('@tauri-apps/plugin-opener', () => ({ revealItemInDir: vi.fn() }));
vi.mock('@tauri-apps/plugin-fs', () => ({
	readTextFile: vi.fn(async (p: string) => disk.get(key(p))!.content),
	writeTextFile: vi.fn(),
	mkdir: vi.fn(),
	remove: vi.fn(),
	rename: vi.fn(),
	exists: vi.fn(async (p: string) => disk.has(key(p))),
	copyFile: vi.fn(async (from: string, to: string) => {
		const src = disk.get(key(from))!;
		const existing = disk.get(key(to));
		// APFS keeps the existing entry's name and truncates its bytes.
		disk.set(key(to), { name: existing?.name ?? to, content: src.content });
	}),
	readDir: vi.fn(async (dir: string) =>
		[...disk.values()]
			.filter((e) => e.name.startsWith(dir + '/') && !e.name.slice(dir.length + 1).includes('/'))
			.map((e) => ({ name: e.name.slice(dir.length + 1), isDirectory: false, isFile: true, isSymlink: false })),
	),
}));
vi.mock('#lib/utils/debug.js', () => ({
	debug: vi.fn(),
	error: vi.fn(),
	timeAsync: vi.fn((_t: string, _l: string, fn: () => Promise<unknown>) => fn()),
	timeSync: vi.fn((_t: string, _l: string, fn: () => unknown) => fn()),
}));

import { duplicateItem } from '#lib/core/filesystem/fs.service.js';
import { generateCopyName } from '#lib/core/filesystem/fs.logic.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';

describe('F43 duplicateItem on a case-insensitive volume', () => {
	beforeEach(() => {
		disk.clear();
		vaultStore._reset(); // no vault path -> refreshTree is a no-op
		disk.set(key('/v/Note.md'), { name: '/v/Note.md', content: 'ORIGINAL NOTE' });
		disk.set(key('/v/note copy.md'), { name: '/v/note copy.md', content: 'SEPARATE NOTE, MUST SURVIVE' });
	});

	it('generateCopyName treats a case-variant sibling as taken', () => {
		const name = generateCopyName('Note.md', false, ['Note.md', 'note copy.md']);
		expect(name.toLowerCase()).not.toBe('note copy.md');
	});

	it('duplicating Note.md does not overwrite the existing "note copy.md"', async () => {
		await duplicateItem('/v/Note.md', false);
		expect(disk.get(key('/v/note copy.md'))!.content).toBe('SEPARATE NOTE, MUST SURVIVE');
	});
});
