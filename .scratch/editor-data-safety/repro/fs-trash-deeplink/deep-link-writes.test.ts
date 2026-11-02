/**
 * F126, F129, F130, F142: deep-link write paths, run through the real
 * deep-link service, note creator, template processor and frontmatter logic.
 * Only Tauri plugins and side-effect services are mocked; the fs is an
 * in-memory disk so the assertions read the bytes that would land on disk.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupLocalStorage, clearLocalStorage } from '../../fixtures/localStorage.fixture';

setupLocalStorage();

const disk = new Map<string, string>();

vi.mock('@tauri-apps/plugin-deep-link', () => ({
	onOpenUrl: vi.fn(() => Promise.resolve(vi.fn())),
	getCurrent: vi.fn(() => Promise.resolve(null)),
}));
vi.mock('@tauri-apps/plugin-clipboard-manager', () => ({ readText: vi.fn(() => Promise.resolve('')) }));
vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(async (cmd: string, args?: { path?: string; content?: string }) => {
		if (cmd === 'create_note' && args?.path) {
			if (disk.has(args.path)) throw new Error('exists');
			disk.set(args.path, args.content ?? '');
		}
		return undefined;
	}),
}));
vi.mock('@tauri-apps/plugin-fs', () => ({
	exists: vi.fn(async (p: string) => disk.has(p)),
	readTextFile: vi.fn(async (p: string) => {
		if (!disk.has(p)) throw new Error('ENOENT ' + p);
		return disk.get(p)!;
	}),
	writeTextFile: vi.fn(async (p: string, c: string) => { disk.set(p, c); }),
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
	saveAllDirtyTabs: vi.fn(() => Promise.resolve([])),
	registerTabCloseListener: vi.fn(() => () => {}),
}));
vi.mock('#lib/core/filesystem/fs.service.js', () => ({ refreshTree: vi.fn(() => Promise.resolve()) }));
vi.mock('#lib/core/editor/editor.hooks.js', () => ({ markRecentSave: vi.fn(), notifyAfterSave: vi.fn() }));
vi.mock('#lib/plugins/periodic-notes/periodic-notes.service.js', () => ({
	openOrCreateDailyNote: vi.fn(() => Promise.resolve()),
}));

import dayjs from 'dayjs';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { executeAction } from '#lib/features/deep-link/deep-link.service.js';
import { registerDeepLinkActions } from '#lib/app/deep-link-actions.js';
import { parseFrontmatterProperties } from '#lib/core/frontmatter/properties.logic.js';
import { buildPeriodicNotePath } from '#lib/plugins/periodic-notes/periodic-notes.logic.js';

const V = '/v';
registerDeepLinkActions();

const NOTE_WITH_FM = '---\n_type: Task\nstatus: open\n---\nBody line\n';

describe('deep-link writes', () => {
	beforeEach(() => {
		disk.clear();
		clearLocalStorage();
		vaultStore._reset();
		vaultStore.open(V);
		settingsStore.updateQuickCapture({ templates: { note: '', clip: '', link: '', shot: '', file: '' } });
	});

	it('F126: new + silent does not replace an existing note', async () => {
		disk.set(`${V}/Inbox.md`, 'months of inbox notes');
		await executeAction({ type: 'new', vault: 'v', name: 'Inbox', content: 'hi', silent: true }, V);
		expect(disk.get(`${V}/Inbox.md`)).toContain('months of inbox notes');
	});

	it('F126 (variant): new + silent with no content does not truncate an existing note', async () => {
		disk.set(`${V}/Inbox.md`, 'months of inbox notes');
		await executeAction({ type: 'new', vault: 'v', name: 'Inbox', silent: true }, V);
		expect(disk.get(`${V}/Inbox.md`)).toBe('months of inbox notes');
	});

	it('F129: new + prepend keeps the frontmatter block parseable', async () => {
		disk.set(`${V}/N.md`, NOTE_WITH_FM);
		await executeAction({ type: 'new', vault: 'v', name: 'N', content: 'Hi', prepend: true, silent: true }, V);
		const written = disk.get(`${V}/N.md`)!;
		expect(written).toContain('Hi');
		expect(parseFrontmatterProperties(written).map((p) => p.key)).toEqual(['_type', 'status']);
	});

	it('F129: daily + prepend keeps the frontmatter block parseable', async () => {
		const pn = settingsStore.periodicNotes;
		const path = buildPeriodicNotePath(V, pn.folder, pn.daily.format, dayjs());
		disk.set(path, NOTE_WITH_FM);
		await executeAction({ type: 'daily', vault: 'v', content: 'Hi', prepend: true }, V);
		const written = disk.get(path)!;
		expect(written).toContain('Hi');
		expect(parseFrontmatterProperties(written).map((p) => p.key)).toEqual(['_type', 'status']);
	});

	it('F130: link capture with a colon in the title keeps the template frontmatter keys', async () => {
		disk.set(`${V}/Templates/link.md`, '---\ntitle: <% title %>\ncreated: 2026-11-02\n---\n');
		settingsStore.updateQuickCapture({ templates: { note: '', clip: '', link: 'Templates/link.md', shot: '', file: '' } });
		await executeAction(
			{ type: 'capture', vault: 'v', kind: 'link', url: 'https://example.com', title: 'Clean Code: A Handbook' } as never,
			V,
		);
		const written = [...disk.entries()].find(([k]) => k !== `${V}/Templates/link.md`)![1];
		expect(written).toContain('created');
	});

	it('F130 (dup F145): tags capture with a template that has one bad line keeps the other keys', async () => {
		disk.set(`${V}/Templates/note.md`, '---\ncreated: 2026-11-02\nproject: [inbox\n---\n');
		settingsStore.updateQuickCapture({ templates: { note: 'Templates/note.md', clip: '', link: '', shot: '', file: '' } });
		await executeAction({ type: 'capture', vault: 'v', kind: 'note', text: 'hello', tags: ['x'] } as never, V);
		const written = [...disk.entries()].find(([k]) => k !== `${V}/Templates/note.md`)![1];
		expect(written).toContain('created');
	});

	it('F142: non-silent new stores <% %> content literally', async () => {
		const snippet = 'Hello <%= user.name %>!';
		await executeAction({ type: 'new', vault: 'v', name: 'Snippet', content: snippet }, V);
		expect(disk.get(`${V}/Snippet.md`)).toBe(snippet);
	});
});
