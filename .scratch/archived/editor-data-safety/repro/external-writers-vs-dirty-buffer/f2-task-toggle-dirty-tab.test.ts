/**
 * Audit repro F2: toggling a task from the Tasks tab while the note that owns
 * the task has unsaved edits. Rust `toggle_task_status` reads the file from
 * DISK, and `toggleTask` then syncs that disk-derived text into the tab with
 * markSaved=true. Expected (correct) behavior: the unsaved text survives.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(),
}));

vi.mock('@tauri-apps/plugin-fs', () => ({
	readTextFile: vi.fn(),
	writeTextFile: vi.fn(() => Promise.resolve()),
}));

vi.mock('@tauri-apps/plugin-dialog', () => ({
	ask: vi.fn(),
}));

vi.mock('svelte-sonner', () => ({
	toast: { error: vi.fn(), success: vi.fn() },
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

import { invoke } from '@tauri-apps/api/core';
import { writeTextFile } from '@tauri-apps/plugin-fs';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { onContentChange, resetEditor } from '#lib/core/editor/editor.service.js';
import { tasksStore } from '#lib/features/tasks/tasks.store.svelte.js';
import { openTasksTab, toggleTask } from '#lib/features/tasks/tasks.service.js';

const PATH = '/vault/a.md';
const ON_DISK = '- [ ] buy milk\n';
const TYPED = '- [ ] buy milk\nmy unsaved paragraph\n';

describe('F2: task toggle vs a dirty tab of the same note', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.clearAllMocks();
		resetEditor();
		tasksStore.reset();
		tasksStore.setSectionTag('');
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('keeps the unsaved paragraph after toggling a task of that note from the Tasks tab', async () => {
		editorStore.addTab({ path: PATH, name: 'a.md', content: ON_DISK, savedContent: ON_DISK });
		// User types in note A: the keystroke pipeline updates tab.content and
		// arms the real 2 s body debounce.
		onContentChange(TYPED, false);
		expect(editorStore.tabs[0].content).toBe(TYPED);

		// Within 2 s, the user opens the Tasks tab (no flush) and ticks the task.
		openTasksTab();
		expect(editorStore.activeTabPath).not.toBe(PATH);

		// Rust reads the DISK copy (no paragraph), toggles line 1, writes it,
		// and returns the disk-derived text.
		vi.mocked(invoke).mockImplementation(async (cmd: string) => {
			if (cmd === 'toggle_task_status') {
				return {
					updatedContent: '- [x] buy milk\n',
					updateResult: { changed: true, affected: [], version: 2, upserted: [PATH], removed: [], fullRescan: false },
				};
			}
			if (cmd === 'get_all_tasks_v2') return [];
			return undefined;
		});

		await toggleTask(PATH, 1);

		// Let the pending debounced auto-save fire.
		await vi.advanceTimersByTimeAsync(2500);

		const tab = editorStore.tabs.find((t) => t.path === PATH)!;
		const writtenWithParagraph = vi
			.mocked(writeTextFile)
			.mock.calls.some(([p, c]) => p === PATH && String(c).includes('my unsaved paragraph'));

		// Sanity: the toggle path ran and reached the tab (true with or without the bug).
		expect(invoke).toHaveBeenCalledWith('toggle_task_status', { path: PATH, lineNumber: 1 });
		expect(tab.content).toContain('- [x] buy milk');

		// Correct behavior: the paragraph is still in the buffer or was saved.
		expect(tab.content.includes('my unsaved paragraph') || writtenWithParagraph).toBe(true);
	});
});
