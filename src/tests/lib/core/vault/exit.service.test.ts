import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@tauri-apps/plugin-fs', () => ({
	readTextFile: vi.fn(),
	writeTextFile: vi.fn(),
	mkdir: vi.fn(() => Promise.resolve()),
	exists: vi.fn(() => Promise.resolve(true)),
}));

vi.mock('@tauri-apps/plugin-dialog', () => ({
	ask: vi.fn(),
}));

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('svelte-sonner', () => ({
	toast: { error: vi.fn(), success: vi.fn() },
}));

import { writeTextFile } from '@tauri-apps/plugin-fs';
import { ask } from '@tauri-apps/plugin-dialog';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { resetEditor } from '#lib/core/editor/editor.service.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { startSettingsPersistence, stopSettingsPersistence } from '#lib/core/settings/settings-persistence.svelte.js';
import { registerWriteBarrier } from '#lib/core/vault/write-barrier.service.js';
import { prepareForExit } from '#lib/core/vault/exit.service.js';

const VAULT = '/vault';
const NOTE = '/vault/note.md';
const SETTINGS_FILE = '/vault/.kokobrain/settings.json';

/** Paths passed to the mocked `writeTextFile`, in call order. */
function writtenPaths(): string[] {
	return vi.mocked(writeTextFile).mock.calls.map(([path]) => String(path));
}

describe('prepareForExit', () => {
	let drain: ReturnType<typeof vi.fn<() => Promise<void>>>;
	let unregisterBarrier: () => void;

	beforeEach(() => {
		vi.clearAllMocks();
		resetEditor();
		editorStore.reset();
		settingsStore.reset();
		vi.mocked(writeTextFile).mockResolvedValue(undefined);
		drain = vi.fn(() => Promise.resolve());
		// Stands in for the event-calendar barrier `registerAppPorts` registers.
		unregisterBarrier = registerWriteBarrier('event-calendar', drain);
		startSettingsPersistence(VAULT);
	});

	afterEach(async () => {
		unregisterBarrier();
		await stopSettingsPersistence();
		resetEditor();
		editorStore.reset();
	});

	it('saves a dirty tab and goes on', async () => {
		editorStore.addTab({ path: NOTE, name: 'note.md', content: 'old', savedContent: 'old' });
		editorStore.updateContent('typed just before quitting');

		const goOn = await prepareForExit();

		expect(goOn).toBe(true);
		expect(writeTextFile).toHaveBeenCalledWith(NOTE, 'typed just before quitting');
		expect(editorStore.tabs[0].savedContent).toBe('typed just before quitting');
		expect(ask).not.toHaveBeenCalled();
	});

	it('goes on with no tabs open, draining writes and flushing settings', async () => {
		settingsStore.updateLayout({ railPanelsVisible: false });

		const goOn = await prepareForExit();

		expect(goOn).toBe(true);
		expect(drain).toHaveBeenCalledTimes(1);
		expect(writtenPaths()).toEqual([SETTINGS_FILE]);
	});

	it('saves tabs, then drains pending writes, then flushes settings', async () => {
		editorStore.addTab({ path: NOTE, name: 'note.md', content: 'old', savedContent: 'old' });
		editorStore.updateContent('new');
		settingsStore.updateLayout({ railPanelsVisible: false });
		const order: string[] = [];
		vi.mocked(writeTextFile).mockImplementation(async (path) => { order.push(String(path)); });
		drain.mockImplementation(async () => { order.push('drain'); });

		await prepareForExit();

		expect(order).toEqual([NOTE, 'drain', SETTINGS_FILE]);
	});

	it('asks before discarding a failed save, naming the file', async () => {
		editorStore.addTab({ path: NOTE, name: 'note.md', content: 'old', savedContent: 'old' });
		editorStore.updateContent('new');
		vi.mocked(writeTextFile).mockRejectedValueOnce(new Error('disk full'));
		vi.mocked(ask).mockResolvedValue(true);

		const goOn = await prepareForExit();

		expect(ask).toHaveBeenCalledTimes(1);
		expect(ask).toHaveBeenCalledWith(
			'Failed to save: note.md. Close anyway and lose unsaved changes?',
			{ title: 'Unsaved Changes', kind: 'warning', okLabel: 'Close Anyway', cancelLabel: 'Cancel' },
		);
		expect(goOn).toBe(true);
		expect(drain).toHaveBeenCalledTimes(1);
	});

	it('returns false on cancel, without draining or flushing settings', async () => {
		editorStore.addTab({ path: NOTE, name: 'note.md', content: 'old', savedContent: 'old' });
		editorStore.updateContent('new');
		settingsStore.updateLayout({ railPanelsVisible: false });
		vi.mocked(writeTextFile).mockRejectedValueOnce(new Error('disk full'));
		vi.mocked(ask).mockResolvedValue(false);

		const goOn = await prepareForExit();

		expect(goOn).toBe(false);
		expect(drain).not.toHaveBeenCalled();
		expect(writtenPaths()).toEqual([NOTE]);
		// The edit stays in the buffer for the user to retry.
		expect(editorStore.tabs[0].content).toBe('new');
		expect(editorStore.tabs[0].savedContent).toBe('old');
	});

	it('propagates a drain failure to the caller', async () => {
		drain.mockRejectedValueOnce(new Error('calendar write failed'));

		await expect(prepareForExit()).rejects.toThrow('calendar write failed');
	});
});
