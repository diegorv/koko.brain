import { describe, it, expect, vi, beforeEach } from 'vitest';

/** Fake disk: `@tauri-apps/plugin-fs` text calls against an in-memory map. */
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
	mkdir: vi.fn(async () => undefined),
}));

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(async () => undefined),
}));

vi.mock('svelte-sonner', () => ({
	toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock('#lib/features/file-icons/file-icons.icon-data.js', () => ({
	preloadPacks: vi.fn(),
	setOnPacksLoaded: vi.fn(),
}));

import { setIconForPath } from '#lib/features/file-icons/file-icons.service.js';
import { toggleFavoriteForPath } from '#lib/features/properties/lifecycle.service.js';
import { fileIconsStore } from '#lib/features/file-icons/file-icons.store.svelte.js';
import { resetEditor } from '#lib/core/editor/editor.service.js';

/** Lines that are exactly `---` (frontmatter fences or thematic breaks). */
function fenceLines(text: string): number {
	return text.split('\n').filter((l) => l === '---').length;
}

describe('repro o10 fidelity-2: an empty `---\\n---` block is treated as frontmatter by writers', () => {
	beforeEach(() => {
		disk.clear();
		resetEditor();
		fileIconsStore.reset();
	});

	it('folder icon: the app placeholder plus the icon write leaves exactly one frontmatter block', async () => {
		await setIconForPath('/vault', '/vault/Projects', 'lucide', 'folder', '#0000ff', undefined, true);

		const written = disk.get('/vault/Projects/Projects.md')!;
		// Correct: `---\n_icon: ...\n_color: ...\n---\n` (two fences, empty body).
		expect(written).toContain('_icon: lucide:folder');
		expect(fenceLines(written), JSON.stringify(written)).toBe(2);
	});

	it('sidebar favorite on a note starting with an empty block does not push the old fences into the body', async () => {
		disk.set('/vault/n.md', '---\n---\n# Title\n');
		await toggleFavoriteForPath('/vault/n.md', true);

		const written = disk.get('/vault/n.md')!;
		expect(written).toContain('_favorite: true');
		expect(fenceLines(written), JSON.stringify(written)).toBe(2);
	});
});
