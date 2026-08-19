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
import {
	onContentChange,
	resetEditor,
	syncExternalContentToEditor,
} from '$lib/core/editor/editor.service';

/**
 * The `schedule` parameter of `syncExternalContentToEditor` (ARCH 2.1).
 *
 * Like `editor.service.reset-timers.test.ts` — and unlike the main
 * `editor.service.test.ts` — this suite uses the REAL debounce util with fake
 * timers: the main suite's fire-immediately debounce mock cannot tell the
 * 500 ms frontmatter timer apart from the 2000 ms body timer, which is exactly
 * what the schedule parameter selects.
 *
 * Before ARCH 2.1 the schedule was implicit: an external write only armed a
 * timer if it happened to reach CodeMirror (active tab + mounted view), and
 * which timer it armed was inferred by the updateListener from whether the
 * PREVIOUS document had frontmatter — so adding the first property to a note
 * without frontmatter waited 2 s, and a background-tab write never armed
 * anything at all.
 */
describe('syncExternalContentToEditor schedule (real debounce)', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		resetEditor();
		vi.mocked(writeTextFile).mockClear();
		vi.mocked(writeTextFile).mockResolvedValue(undefined);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	/** Opens a clean tab; external writes with markSaved=false make it dirty. */
	function addTab(path: string) {
		editorStore.addTab({
			path,
			name: path.split('/').pop() ?? path,
			content: 'saved',
			savedContent: 'saved',
		});
	}

	it("'frontmatter' arms the 500ms timer, not the 2000ms one", async () => {
		addTab('/vault/note.md');

		syncExternalContentToEditor('/vault/note.md', '---\na: 1\n---\nbody', false, 'frontmatter');

		await vi.advanceTimersByTimeAsync(499);
		expect(writeTextFile).not.toHaveBeenCalled();

		await vi.advanceTimersByTimeAsync(2);
		expect(writeTextFile).toHaveBeenCalledWith('/vault/note.md', '---\na: 1\n---\nbody');
	});

	it("'body' waits the full 2000ms — the 500ms frontmatter timer is not armed", async () => {
		addTab('/vault/note.md');

		syncExternalContentToEditor('/vault/note.md', 'new body', false, 'body');

		await vi.advanceTimersByTimeAsync(600);
		expect(writeTextFile).not.toHaveBeenCalled();

		await vi.advanceTimersByTimeAsync(1500);
		expect(writeTextFile).toHaveBeenCalledWith('/vault/note.md', 'new body');
	});

	it("'none' arms no timer — the content is already on disk", async () => {
		addTab('/vault/note.md');

		syncExternalContentToEditor('/vault/note.md', 'from disk', false, 'none');

		await vi.advanceTimersByTimeAsync(5000);
		expect(writeTextFile).not.toHaveBeenCalled();
	});

	it("'none' does not cancel a save a keystroke already scheduled", async () => {
		addTab('/vault/note.md');
		onContentChange('typed', false);

		syncExternalContentToEditor('/vault/note.md', 'typed', false, 'none');

		await vi.advanceTimersByTimeAsync(2100);
		expect(writeTextFile).toHaveBeenCalledWith('/vault/note.md', 'typed');
	});

	it('arms the schedule for a background tab, which never reaches CodeMirror', async () => {
		addTab('/vault/background.md');
		addTab('/vault/active.md');
		const signalBefore = editorStore.externalContentSignal;

		syncExternalContentToEditor('/vault/background.md', 'bg edit', false, 'frontmatter');

		// No doc replace is dispatched for a background tab...
		expect(editorStore.externalContentSignal).toBe(signalBefore);
		// ...but the caller's schedule still applies.
		await vi.advanceTimersByTimeAsync(600);
		expect(writeTextFile).toHaveBeenCalledWith('/vault/background.md', 'bg edit');
	});
});
