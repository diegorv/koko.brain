import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@tauri-apps/plugin-fs', () => ({
	readTextFile: vi.fn(),
	writeTextFile: vi.fn(),
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

vi.mock('#lib/utils/debug.js', () => ({
	debug: vi.fn(),
	error: vi.fn(),
	timeAsync: vi.fn((_tag: string, _label: string, fn: () => Promise<unknown>) => fn()),
	timeSync: vi.fn((_tag: string, _label: string, fn: () => unknown) => fn()),
	perfStart: vi.fn(() => 0),
	perfEnd: vi.fn(),
	perfBaseline: vi.fn(),
}));

import { writeTextFile } from '@tauri-apps/plugin-fs';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { onContentChange, resetEditor } from '#lib/core/editor/editor.service.js';

/**
 * Repro for h10 / save-pipeline-10: the 2 s body auto-save is trailing-only
 * (`debounce.ts` has no maxWait), so a run of keystrokes that never leaves a
 * 2 s gap never reaches disk. Real debounce, real editor store, fake timers.
 *
 * Expected (correct) behavior: during a continuous typing run the edit is
 * written to disk within a bounded interval. Current behavior: nothing is
 * written until the typing pauses for 2 s.
 */
describe('body auto-save during a continuous typing run (real debounce)', () => {
	const PATH = '/vault/note.md';

	beforeEach(() => {
		vi.useFakeTimers();
		resetEditor();
		vi.mocked(writeTextFile).mockClear();
		vi.mocked(writeTextFile).mockResolvedValue(undefined);
		editorStore.addTab({
			path: PATH,
			name: 'note.md',
			content: 'saved',
			savedContent: 'saved',
		});
	});

	afterEach(() => {
		resetEditor();
		vi.useRealTimers();
	});

	it('writes to disk within 10 s of typing 1 keystroke per second, with no 2 s pause', async () => {
		let text = 'saved';
		// 15 keystrokes, 1 s apart: every gap is shorter than the 2 s debounce.
		for (let i = 0; i < 15; i++) {
			text += ` word${i}`;
			onContentChange(text, false);
			await vi.advanceTimersByTimeAsync(1000);
		}

		// 15 s of typing has elapsed. A save should have happened during the run.
		expect(writeTextFile).toHaveBeenCalled();
	});
});
