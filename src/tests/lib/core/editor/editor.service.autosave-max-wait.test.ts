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
 * The 2 s body auto-save is a debounce, so a typing run that never leaves a
 * 2 s gap would never reach disk. Its 10 s max wait bounds what a quit the
 * app cannot intercept (Dock Quit, logout, a crash) can lose. Real debounce,
 * real editor store, fake timers.
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

	/** Types one word per second, `count` times, starting now. */
	async function typeOnePerSecond(count: number): Promise<string> {
		let text = 'saved';
		for (let i = 0; i < count; i++) {
			text += ` word${i}`;
			onContentChange(text, false);
			await vi.advanceTimersByTimeAsync(1000);
		}
		return text;
	}

	it('writes the note within 10 s of typing 1 keystroke per second, with no 2 s pause', async () => {
		// Every gap is shorter than the 2 s debounce; the 10th second ends at the max wait.
		const text = await typeOnePerSecond(10);

		expect(writeTextFile).toHaveBeenCalledTimes(1);
		expect(writeTextFile).toHaveBeenCalledWith(PATH, text);
		expect(editorStore.tabs[0].savedContent).toBe(text);
	});

	it('does not write before the max wait while the typing never pauses', async () => {
		// 9 s in, the last keystroke 1 s ago: neither timer is due yet.
		await typeOnePerSecond(9);

		expect(writeTextFile).not.toHaveBeenCalled();
		expect(editorStore.tabs[0].savedContent).toBe('saved');
	});

	it('keeps saving every 10 s during a longer run', async () => {
		await typeOnePerSecond(25);

		expect(writeTextFile).toHaveBeenCalledTimes(2);
	});
});
