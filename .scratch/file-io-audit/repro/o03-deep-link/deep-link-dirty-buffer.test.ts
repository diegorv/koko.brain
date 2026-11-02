import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupLocalStorage } from '../../fixtures/localStorage.fixture';

setupLocalStorage();

/** Fake disk shared by the plugin-fs mock. */
const disk = new Map<string, string>();

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(async () => undefined),
}));

vi.mock('@tauri-apps/plugin-fs', () => ({
	exists: vi.fn(async (p: string) => disk.has(p)),
	readTextFile: vi.fn(async (p: string) => {
		if (!disk.has(p)) throw new Error(`not found: ${p}`);
		return disk.get(p)!;
	}),
	writeTextFile: vi.fn(async (p: string, c: string) => {
		disk.set(p, c);
	}),
	mkdir: vi.fn(async () => undefined),
}));

vi.mock('@tauri-apps/plugin-dialog', () => ({
	ask: vi.fn(async () => true),
}));

vi.mock('@tauri-apps/plugin-deep-link', () => ({
	onOpenUrl: vi.fn(() => Promise.resolve(vi.fn())),
	getCurrent: vi.fn(() => Promise.resolve(null)),
}));

vi.mock('@tauri-apps/plugin-clipboard-manager', () => ({
	readText: vi.fn(async () => ''),
}));

import dayjs from 'dayjs';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { onContentChange, resetEditor } from '#lib/core/editor/editor.service.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { executeAction } from '#lib/features/deep-link/deep-link.service.js';
import { registerDeepLinkActions } from '#lib/app/deep-link-actions.js';
import { buildPeriodicNotePath } from '#lib/plugins/periodic-notes/periodic-notes.logic.js';

const VAULT = '/vault';
const TYPED_LINE = 'A sentence the user typed a second ago.';

describe('repro o03: deep-link append/prepend/overwrite on a note with unsaved typing', () => {
	let unregister: () => void;

	beforeEach(() => {
		vi.useFakeTimers();
		disk.clear();
		editorStore.reset();
		vaultStore._reset();
		vaultStore.open(VAULT);
		unregister = registerDeepLinkActions();
	});

	afterEach(() => {
		unregister();
		resetEditor();
		vi.useRealTimers();
	});

	it('daily append keeps the unsaved typing of the open daily note', async () => {
		const settings = settingsStore.periodicNotes;
		const daily = buildPeriodicNotePath(VAULT, settings.folder, settings.daily.format, dayjs());
		const saved = '# Today\n';
		disk.set(daily, saved);
		editorStore.addTab({ path: daily, name: 'today', content: saved, savedContent: saved });

		// User types in the daily note; the 2 s autosave is armed, not fired.
		onContentChange(saved + TYPED_LINE + '\n');

		// kokobrain://daily?vault=V&append=true&content=clip fires inside the window.
		await executeAction({ type: 'daily', vault: 'V', append: true, content: 'CLIP' }, VAULT);
		await vi.advanceTimersByTimeAsync(3000);

		const tab = editorStore.tabs.find((t) => t.path === daily)!;
		expect(tab.content).toContain('CLIP');
		expect(tab.content).toContain(TYPED_LINE);
		expect(disk.get(daily)).toContain(TYPED_LINE);
	});

	it('new + append keeps the unsaved typing of the open note', async () => {
		const note = `${VAULT}/Inbox.md`;
		const saved = '# Inbox\n';
		disk.set(note, saved);
		editorStore.addTab({ path: note, name: 'Inbox', content: saved, savedContent: saved });
		onContentChange(saved + TYPED_LINE + '\n');

		await executeAction({ type: 'new', vault: 'V', name: 'Inbox', append: true, content: 'CLIP' }, VAULT);
		await vi.advanceTimersByTimeAsync(3000);

		const tab = editorStore.tabs.find((t) => t.path === note)!;
		expect(tab.content).toContain('CLIP');
		expect(tab.content).toContain(TYPED_LINE);
		expect(disk.get(note)).toContain(TYPED_LINE);
	});

	it('new + prepend keeps the unsaved typing of the open note', async () => {
		const note = `${VAULT}/Inbox.md`;
		const saved = '# Inbox\n';
		disk.set(note, saved);
		editorStore.addTab({ path: note, name: 'Inbox', content: saved, savedContent: saved });
		onContentChange(saved + TYPED_LINE + '\n');

		await executeAction({ type: 'new', vault: 'V', name: 'Inbox', prepend: true, content: 'CLIP' }, VAULT);
		await vi.advanceTimersByTimeAsync(3000);

		const tab = editorStore.tabs.find((t) => t.path === note)!;
		expect(tab.content).toContain(TYPED_LINE);
		expect(disk.get(note)).toContain(TYPED_LINE);
	});
});
