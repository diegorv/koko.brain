import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupLocalStorage } from '../../../fixtures/localStorage.fixture';

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

vi.mock('svelte-sonner', () => ({
	toast: { error: vi.fn(), info: vi.fn(), success: vi.fn(), warning: vi.fn() },
}));

import dayjs from 'dayjs';
import { writeTextFile } from '@tauri-apps/plugin-fs';
import { toast } from 'svelte-sonner';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { onContentChange, resetEditor } from '#lib/core/editor/editor.service.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { executeAction } from '#lib/features/deep-link/deep-link.service.js';
import { registerDeepLinkActions } from '#lib/app/deep-link-actions.js';
import { buildPeriodicNotePath } from '#lib/plugins/periodic-notes/periodic-notes.logic.js';

const VAULT = '/vault';
const TYPED_LINE = 'A sentence the user typed a second ago.';

function dailyPath(): string {
	const settings = settingsStore.periodicNotes;
	return buildPeriodicNotePath(VAULT, settings.folder, settings.daily.format, dayjs());
}

function tabOf(path: string) {
	return editorStore.tabs.find((t) => t.path === path)!;
}

function writesTo(path: string): string[] {
	return vi.mocked(writeTextFile).mock.calls.filter(([p]) => p === path).map(([, c]) => c as string);
}

describe('deep-link append/prepend/overwrite on a note with unsaved typing', () => {
	let unregister: () => void;

	beforeEach(() => {
		vi.useFakeTimers();
		vi.clearAllMocks();
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
		const daily = dailyPath();
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
	it('daily prepend keeps the unsaved typing of the open daily note', async () => {
		const daily = dailyPath();
		const saved = '# Today\n';
		disk.set(daily, saved);
		editorStore.addTab({ path: daily, name: 'today', content: saved, savedContent: saved });
		onContentChange(saved + TYPED_LINE + '\n');

		await executeAction({ type: 'daily', vault: 'V', prepend: true, content: 'CLIP' }, VAULT);
		await vi.advanceTimersByTimeAsync(3000);

		const tab = tabOf(daily);
		expect(tab.content).toBe('CLIP\n# Today\n' + TYPED_LINE + '\n');
		expect(disk.get(daily)).toBe(tab.content);
	});

	it('new + overwrite saves the unsaved typing first, then replaces it', async () => {
		const note = `${VAULT}/Inbox.md`;
		const saved = '# Inbox\n';
		const typed = saved + TYPED_LINE + '\n';
		disk.set(note, saved);
		editorStore.addTab({ path: note, name: 'Inbox', content: saved, savedContent: saved });
		onContentChange(typed);

		await executeAction({ type: 'new', vault: 'V', name: 'Inbox', overwrite: true, content: 'CLIP' }, VAULT);
		await vi.advanceTimersByTimeAsync(3000);

		// The typed text reached disk (and so File History) before the overwrite.
		expect(writesTo(note)).toEqual([typed, 'CLIP']);
		expect(tabOf(note).content).toBe('CLIP');
		expect(disk.get(note)).toBe('CLIP');
	});

	it('daily append writes nothing and keeps the tab dirty when the pre-save fails', async () => {
		const daily = dailyPath();
		const saved = '# Today\n';
		const typed = saved + TYPED_LINE + '\n';
		disk.set(daily, saved);
		editorStore.addTab({ path: daily, name: 'today', content: saved, savedContent: saved });
		onContentChange(typed);
		vi.mocked(writeTextFile).mockRejectedValueOnce(new Error('disk full'));

		await executeAction({ type: 'daily', vault: 'V', append: true, content: 'CLIP' }, VAULT);

		expect(disk.get(daily)).toBe(saved);
		expect(tabOf(daily).content).toBe(typed);
		expect(tabOf(daily).savedContent).toBe(saved);
		expect(toast.error).toHaveBeenCalledWith('Deep link skipped: the open note could not be saved.');
	});

	it.each([
		['append', { append: true }],
		['prepend', { prepend: true }],
		['overwrite', { overwrite: true }],
	])('new + %s writes nothing and keeps the tab dirty when the pre-save fails', async (_mode, flags) => {
		const note = `${VAULT}/Inbox.md`;
		const saved = '# Inbox\n';
		const typed = saved + TYPED_LINE + '\n';
		disk.set(note, saved);
		editorStore.addTab({ path: note, name: 'Inbox', content: saved, savedContent: saved });
		onContentChange(typed);
		vi.mocked(writeTextFile).mockRejectedValueOnce(new Error('disk full'));

		await executeAction({ type: 'new', vault: 'V', name: 'Inbox', content: 'CLIP', ...flags }, VAULT);

		expect(disk.get(note)).toBe(saved);
		expect(tabOf(note).content).toBe(typed);
		expect(tabOf(note).savedContent).toBe(saved);
		expect(toast.error).toHaveBeenCalledWith('Deep link skipped: the open note could not be saved.');
	});

	it('new + append on a clean tab writes once, as before', async () => {
		const note = `${VAULT}/Inbox.md`;
		const saved = '# Inbox\n';
		disk.set(note, saved);
		editorStore.addTab({ path: note, name: 'Inbox', content: saved, savedContent: saved });

		await executeAction({ type: 'new', vault: 'V', name: 'Inbox', append: true, content: 'CLIP' }, VAULT);

		expect(writesTo(note)).toEqual(['# Inbox\n\nCLIP']);
		expect(tabOf(note).content).toBe('# Inbox\n\nCLIP');
	});

	it('new + append on a closed note writes the disk copy, as before', async () => {
		const note = `${VAULT}/Inbox.md`;
		disk.set(note, '# Inbox\n');

		await executeAction({ type: 'new', vault: 'V', name: 'Inbox', append: true, silent: true, content: 'CLIP' }, VAULT);

		expect(writesTo(note)).toEqual(['# Inbox\n\nCLIP']);
	});
});
