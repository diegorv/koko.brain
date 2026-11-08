/**
 * Audit repro F7: deep-link `new` with append/prepend, and `daily` with
 * content, read the target note from DISK and sync the result into the open
 * tab with markSaved=true. When that tab has unsaved edits, the edits must
 * survive (correct behavior); today they are dropped from buffer and disk.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import dayjs from 'dayjs';
import { setupLocalStorage, clearLocalStorage } from '../../fixtures/localStorage.fixture';

setupLocalStorage();

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(() => Promise.resolve(undefined)),
}));

vi.mock('@tauri-apps/plugin-deep-link', () => ({
	onOpenUrl: vi.fn(() => Promise.resolve(vi.fn())),
	getCurrent: vi.fn(() => Promise.resolve(null)),
}));

vi.mock('@tauri-apps/plugin-clipboard-manager', () => ({
	readText: vi.fn(() => Promise.resolve('')),
}));

vi.mock('@tauri-apps/plugin-fs', () => ({
	exists: vi.fn(),
	readTextFile: vi.fn(),
	writeTextFile: vi.fn(() => Promise.resolve()),
	mkdir: vi.fn(),
}));

vi.mock('@tauri-apps/plugin-dialog', () => ({
	ask: vi.fn(),
}));

vi.mock('svelte-sonner', () => ({
	toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn() },
}));

vi.mock('#lib/utils/debug.js', () => ({
	debug: vi.fn(),
	error: vi.fn(),
	timeAsync: vi.fn(async (_tag: string, _label: string, fn: () => Promise<unknown>) => fn()),
	timeSync: vi.fn((_tag: string, _label: string, fn: () => unknown) => fn()),
	perfStart: vi.fn(() => 0),
	perfEnd: vi.fn(),
	perfBaseline: vi.fn(),
}));

vi.mock('#lib/core/note-creator/note-creator.service.js', () => ({
	openOrCreateNote: vi.fn(() => Promise.resolve()),
}));

vi.mock('#lib/plugins/periodic-notes/periodic-notes.service.js', () => ({
	openOrCreateDailyNote: vi.fn(() => Promise.resolve()),
}));

vi.mock('#lib/core/filesystem/fs.service.js', () => ({
	refreshTree: vi.fn(() => Promise.resolve()),
}));

vi.mock('#lib/core/editor/editor.hooks.js', () => ({
	markRecentSave: vi.fn(),
	notifyAfterSave: vi.fn(),
}));

import { exists, readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { onContentChange, resetEditor } from '#lib/core/editor/editor.service.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { deepLinkStore } from '#lib/features/deep-link/deep-link.store.svelte.js';
import { executePendingAction } from '#lib/features/deep-link/deep-link.service.js';
import { registerDeepLinkActions } from '#lib/app/deep-link-actions.js';
import { buildPeriodicNotePath } from '#lib/plugins/periodic-notes/periodic-notes.logic.js';

const ON_DISK = 'existing line\n';
const TYPED = 'existing line\nunsaved sentence\n';

function wasPersistedOrKept(path: string): boolean {
	const tab = editorStore.tabs.find((t) => t.path === path)!;
	const written = vi
		.mocked(writeTextFile)
		.mock.calls.some(([p, c]) => p === path && String(c).includes('unsaved sentence'));
	return tab.content.includes('unsaved sentence') || written;
}

describe('F7: deep-link writes vs a dirty tab of the target note', () => {
	let unregister: () => void;

	beforeEach(() => {
		vi.useFakeTimers();
		vi.clearAllMocks();
		clearLocalStorage();
		resetEditor();
		vaultStore._reset();
		vaultStore.open('/vault');
		deepLinkStore.reset();
		unregister = registerDeepLinkActions();
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(readTextFile).mockResolvedValue(ON_DISK);
	});

	afterEach(() => {
		unregister();
		vi.useRealTimers();
	});

	it.each([
		['append', { append: true }],
		['prepend', { prepend: true }],
	] as const)('new + %s keeps the unsaved sentence of the open tab', async (_label, flags) => {
		const path = '/vault/note.md';
		editorStore.addTab({ path, name: 'note.md', content: ON_DISK, savedContent: ON_DISK });
		onContentChange(TYPED, false);

		deepLinkStore.setPendingAction({
			type: 'new',
			vault: 'test',
			name: 'note.md',
			content: 'from shortcut',
			silent: true,
			...flags,
		});
		await executePendingAction();
		await vi.advanceTimersByTimeAsync(2500);

		const tab = editorStore.tabs.find((t) => t.path === path)!;
		// Sanity: the deep-link content reached the tab (true with or without the bug).
		expect(tab.content).toContain('from shortcut');
		expect(wasPersistedOrKept(path)).toBe(true);
	});

	it('daily + content keeps the unsaved sentence of the open daily note', async () => {
		const settings = settingsStore.periodicNotes;
		const path = buildPeriodicNotePath('/vault', settings.folder, settings.daily.format, dayjs());
		editorStore.addTab({ path, name: path.split('/').pop()!, content: ON_DISK, savedContent: ON_DISK });
		onContentChange(TYPED, false);

		deepLinkStore.setPendingAction({ type: 'daily', vault: 'test', content: 'from shortcut' });
		await executePendingAction();
		await vi.advanceTimersByTimeAsync(2500);

		const tab = editorStore.tabs.find((t) => t.path === path)!;
		expect(tab.content).toContain('from shortcut');
		expect(wasPersistedOrKept(path)).toBe(true);
	});
});
