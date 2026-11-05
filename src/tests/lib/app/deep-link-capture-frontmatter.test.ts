/**
 * The capture action's title / tags injection rebuilds the template's
 * frontmatter block from its parsed properties. A block that rebuild would
 * lose (here: one that does not parse) must be written as the template made
 * it, with a toast, instead of being replaced by the injected key alone.
 * Runs the real deep-link service, template processor and frontmatter logic
 * over an in-memory disk; only Tauri plugins and side-effect services are mocked.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupLocalStorage, clearLocalStorage } from '../../fixtures/localStorage.fixture';

setupLocalStorage();

const disk = new Map<string, string>();

vi.mock('@tauri-apps/plugin-deep-link', () => ({
	onOpenUrl: vi.fn(() => Promise.resolve(vi.fn())),
	getCurrent: vi.fn(() => Promise.resolve(null)),
}));
vi.mock('@tauri-apps/plugin-clipboard-manager', () => ({ readText: vi.fn(() => Promise.resolve('')) }));
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn(async () => undefined) }));
vi.mock('@tauri-apps/plugin-fs', () => ({
	exists: vi.fn(async (p: string) => disk.has(p)),
	readTextFile: vi.fn(async (p: string) => {
		if (!disk.has(p)) throw new Error('ENOENT ' + p);
		return disk.get(p)!;
	}),
	writeTextFile: vi.fn(async (p: string, c: string) => {
		disk.set(p, c);
	}),
	mkdir: vi.fn(async () => {}),
}));
vi.mock('svelte-sonner', () => ({ toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn() } }));
vi.mock('#lib/utils/debug.js', () => ({
	debug: vi.fn(),
	error: vi.fn(),
	timeAsync: vi.fn((_t: string, _l: string, fn: () => Promise<unknown>) => fn()),
	timeSync: vi.fn((_t: string, _l: string, fn: () => unknown) => fn()),
}));
vi.mock('#lib/utils/log.service.js', () => ({ appendLog: vi.fn() }));
vi.mock('#lib/core/editor/editor.service.js', () => ({
	openFileInEditor: vi.fn(() => Promise.resolve()),
	syncExternalContentToEditor: vi.fn(),
	saveFileByPath: vi.fn(() => Promise.resolve(true)),
	saveAllDirtyTabs: vi.fn(() => Promise.resolve([])),
	registerTabCloseListener: vi.fn(() => () => {}),
}));
vi.mock('#lib/core/filesystem/fs.service.js', () => ({ addToTree: vi.fn() }));
vi.mock('#lib/core/editor/editor.hooks.js', () => ({ markRecentSave: vi.fn(), notifyAfterSave: vi.fn() }));
vi.mock('#lib/plugins/periodic-notes/periodic-notes.service.js', () => ({
	openOrCreateDailyNote: vi.fn(() => Promise.resolve()),
}));

import { toast } from 'svelte-sonner';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { executeAction } from '#lib/features/deep-link/deep-link.service.js';
import { registerDeepLinkActions } from '#lib/app/deep-link-actions.js';

const V = '/v';
const LINK_TEMPLATE = `${V}/Templates/link.md`;
const NOTE_TEMPLATE = `${V}/Templates/note.md`;
registerDeepLinkActions();

/** The one note the capture wrote (every other disk entry is a template). */
function written(): string {
	const notes = [...disk.entries()].filter(([k]) => !k.startsWith(`${V}/Templates/`));
	expect(notes).toHaveLength(1);
	return notes[0][1];
}

function useTemplates(templates: { note?: string; link?: string }) {
	settingsStore.updateQuickCapture({
		templates: { note: templates.note ?? '', clip: '', link: templates.link ?? '', shot: '', file: '' },
	});
}

describe('capture frontmatter injection', () => {
	beforeEach(() => {
		settingsStore.setSettings({ ...settingsStore.settings, explicitOrganization: false });
		disk.clear();
		clearLocalStorage();
		vaultStore._reset();
		vaultStore.open(V);
		useTemplates({});
		vi.mocked(toast.error).mockClear();
	});

	it('a link title with a colon keeps every template key, skips the injection and toasts', async () => {
		disk.set(LINK_TEMPLATE, '---\ntitle: <% title %>\ncreated: 2026-11-02\nsource: web\n---\n');
		useTemplates({ link: 'Templates/link.md' });

		await executeAction(
			{ type: 'capture', vault: 'v', kind: 'link', url: 'https://example.com', title: 'Clean Code: A Handbook' } as never,
			V,
		);

		const note = written();
		expect(note.startsWith('---\ntitle: Clean Code: A Handbook\ncreated: 2026-11-02\nsource: web\n---\n')).toBe(true);
		expect(toast.error).toHaveBeenCalledTimes(1);
		expect(vi.mocked(toast.error).mock.calls[0][0]).toMatch(
			/frontmatter could not be parsed; fix it in the note; the title was not added$/,
		);
	});

	it('a link capture with a title and tags on a lossy block says both were left out', async () => {
		disk.set(LINK_TEMPLATE, '---\ntitle: <% title %>\ncreated: 2026-11-02\n---\n');
		useTemplates({ link: 'Templates/link.md' });

		await executeAction(
			{
				type: 'capture',
				vault: 'v',
				kind: 'link',
				url: 'https://example.com',
				title: 'Clean Code: A Handbook',
				tags: ['books'],
			} as never,
			V,
		);

		expect(written()).not.toContain('tags:');
		expect(toast.error).toHaveBeenCalledTimes(1);
		expect(vi.mocked(toast.error).mock.calls[0][0]).toMatch(/; the title and tags were not added$/);
	});

	it('a note capture with tags and a template block that does not parse keeps the block and toasts', async () => {
		disk.set(NOTE_TEMPLATE, '---\ncreated: 2026-11-02\nproject: [inbox\n---\n');
		useTemplates({ note: 'Templates/note.md' });

		await executeAction({ type: 'capture', vault: 'v', kind: 'note', text: 'hello', tags: ['x'] } as never, V);

		const note = written();
		expect(note.startsWith('---\ncreated: 2026-11-02\nproject: [inbox\n---\n')).toBe(true);
		expect(note).toContain('hello');
		expect(note).not.toContain('tags:');
		expect(toast.error).toHaveBeenCalledTimes(1);
		expect(vi.mocked(toast.error).mock.calls[0][0]).toMatch(/; the tags were not added$/);
	});

	it('a parseable template still gets the link title and the tags injected, with no toast', async () => {
		disk.set(LINK_TEMPLATE, '---\ncreated: 2026-11-02\n---\n');
		useTemplates({ link: 'Templates/link.md' });

		await executeAction(
			{
				type: 'capture',
				vault: 'v',
				kind: 'link',
				url: 'https://example.com',
				title: 'Clean Code: A Handbook',
				tags: ['books'],
			} as never,
			V,
		);

		const note = written();
		expect(note).toContain('created: 2026-11-02');
		expect(note).toContain('title: "Clean Code: A Handbook"');
		expect(note).toContain('books');
		expect(toast.error).not.toHaveBeenCalled();
	});

	it('a capture with nothing to inject writes a block that does not parse without a toast', async () => {
		disk.set(NOTE_TEMPLATE, '---\ncreated: 2026-11-02\nproject: [inbox\n---\n');
		useTemplates({ note: 'Templates/note.md' });

		await executeAction({ type: 'capture', vault: 'v', kind: 'note', text: 'hello' } as never, V);

		expect(written().startsWith('---\ncreated: 2026-11-02\nproject: [inbox\n---\n')).toBe(true);
		expect(toast.error).not.toHaveBeenCalled();
	});

	describe('while Explicit organization is on', () => {
		beforeEach(() => {
			settingsStore.setSettings({ ...settingsStore.settings, explicitOrganization: true });
		});

		afterEach(() => {
			settingsStore.setSettings({ ...settingsStore.settings, explicitOrganization: false });
		});

		it('marks the capture unorganized after the title and tags injection', async () => {
			disk.set(LINK_TEMPLATE, '---\ncreated: 2026-11-02\n---\n');
			useTemplates({ link: 'Templates/link.md' });

			await executeAction(
				{ type: 'capture', vault: 'v', kind: 'link', url: 'https://example.com', title: 'Handbook', tags: ['books'] } as never,
				V,
			);

			const note = written();
			expect(note.startsWith('---\n_organized: false\n')).toBe(true);
			expect(note.match(/^_organized:/gm)).toHaveLength(1);
			expect(note).toContain('title: Handbook');
			expect(note).toContain('books');
		});

		it('marks a capture without a template unorganized', async () => {
			await executeAction({ type: 'capture', vault: 'v', kind: 'note', text: 'hello' } as never, V);

			expect(written()).toBe('---\n_organized: false\n---\nhello');
		});
	});
});
