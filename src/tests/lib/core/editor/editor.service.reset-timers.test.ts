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

vi.mock('$lib/utils/debug', () => ({
	debug: vi.fn(),
	error: vi.fn(),
	timeAsync: vi.fn((_tag: string, _label: string, fn: () => Promise<unknown>) => fn()),
	timeSync: vi.fn((_tag: string, _label: string, fn: () => unknown) => fn()),
	perfStart: vi.fn(() => 0),
	perfEnd: vi.fn(),
	perfBaseline: vi.fn(),
}));

import { writeTextFile } from '@tauri-apps/plugin-fs';
import { editorStore } from '$lib/core/editor/editor.store.svelte';
import { onContentChange, resetEditor } from '$lib/core/editor/editor.service';

/**
 * Regression for the audit finding "resetEditor() cancels only one of the two
 * auto-save debounce timers".
 *
 * Unlike editor.service.test.ts, this suite uses the REAL debounce util with
 * fake timers: the main suite's fire-immediately debounce mock cannot observe
 * a timer that is still pending when resetEditor runs. The defect scenario is
 * a timer armed before reset firing AFTER reset, once new editor state exists
 * (e.g. the next vault opened quickly after a vault switch).
 */
describe('resetEditor timer cancellation (real debounce)', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		editorStore.reset();
		vi.mocked(writeTextFile).mockClear();
		vi.mocked(writeTextFile).mockResolvedValue(undefined);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	/** Opens a clean tab; content edits via onContentChange make it dirty. */
	function addTab(path: string) {
		editorStore.addTab({
			path,
			name: path.split('/').pop() ?? path,
			content: 'saved',
			savedContent: 'saved',
		});
	}

	it('cancels a pending frontmatter (500ms) auto-save armed before the reset', async () => {
		addTab('/vault-a/note.md');
		onContentChange('modified', true);

		resetEditor();
		// New dirty state right after reset, before the leaked timer would fire.
		addTab('/vault-b/other.md');
		editorStore.updateContent('dirty-in-new-vault');

		await vi.advanceTimersByTimeAsync(600);

		expect(writeTextFile).not.toHaveBeenCalled();
	});

	it('cancels a pending body (2000ms) auto-save armed before the reset', async () => {
		addTab('/vault-a/note.md');
		onContentChange('modified', false);

		resetEditor();
		addTab('/vault-b/other.md');
		editorStore.updateContent('dirty-in-new-vault');

		await vi.advanceTimersByTimeAsync(2500);

		expect(writeTextFile).not.toHaveBeenCalled();
	});
});
