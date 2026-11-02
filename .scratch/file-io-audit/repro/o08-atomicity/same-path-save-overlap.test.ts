import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * `writeTextFile` stand-in whose calls stay pending until the test settles
 * them, so the test can observe how many writes of one path are in flight.
 * The real command (tauri-plugin-fs 2.7.1 `write_text_file`) is an async
 * Tauri command, spawned on the tokio runtime per invoke
 * (tauri 2.12.5 `respond_async_serialized_inner`), so two in-flight invokes
 * run their truncate + write_all on separate threads with no lock.
 */
type Pending = { path: string; content: string; resolve: () => void; reject: (e: Error) => void };
const pending: Pending[] = [];
let failAll = false;
let writeCalls = 0;

vi.mock('@tauri-apps/plugin-fs', () => ({
	readTextFile: vi.fn(async () => ''),
	exists: vi.fn(async () => true),
	writeTextFile: vi.fn((path: string, content: string) => {
		writeCalls++;
		if (failAll) return Promise.reject(new Error('No space left on device (os error 28)'));
		return new Promise<void>((resolve, reject) => {
			pending.push({ path, content, resolve, reject });
		});
	}),
}));

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(async () => undefined),
}));

vi.mock('@tauri-apps/plugin-dialog', () => ({
	ask: vi.fn(async () => true),
}));

import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { saveFileByPath, onContentChange, resetEditor } from '#lib/core/editor/editor.service.js';
import { updateNoteFrontmatter } from '#lib/core/frontmatter/frontmatter-write.service.js';

const NOTE = '/vault/note.md';
const SAVED = '---\nstatus: draft\nowner: me\n---\n# Note\n';

describe('repro o08: saves of one path are not serialized', () => {
	beforeEach(() => {
		pending.length = 0;
		failAll = false;
		writeCalls = 0;
		resetEditor();
		editorStore.addTab({ path: NOTE, name: 'note.md', content: SAVED, savedContent: SAVED });
	});

	afterEach(() => {
		resetEditor();
		vi.clearAllTimers();
		vi.useRealTimers();
	});

	it('a Properties edit while the body save is in flight must not start a second write of the same path', async () => {
		// Body autosave fires and its write is in flight.
		editorStore.updateContent(SAVED + 'typed body line\n');
		const bodySave = saveFileByPath(NOTE);
		expect(pending.length).toBe(1);

		// Properties panel removes a property on the same note before the first write returns.
		const fmSave = updateNoteFrontmatter(NOTE, (props) => props.filter((p) => p.key !== 'owner'));
		await Promise.resolve();
		await Promise.resolve();

		// Correct behavior: at most one write per path in flight (the second waits).
		expect(pending.filter((p) => p.path === NOTE).length).toBe(1);

		for (const p of pending) p.resolve();
		await bodySave;
		for (const p of pending) p.resolve();
		await fmSave.catch(() => undefined);
	});

	it('repeated failing debounce runs must not stack independent 5 s retry chains', async () => {
		vi.useFakeTimers();
		failAll = true;

		// Two edit bursts during a persistent failure, 3 s apart.
		onContentChange(SAVED + 'a\n');
		await vi.advanceTimersByTimeAsync(3000);
		onContentChange(SAVED + 'ab\n');
		await vi.advanceTimersByTimeAsync(17000); // t = 20 s

		const before = writeCalls;
		await vi.advanceTimersByTimeAsync(5000); // one retry period
		// Correct behavior: one retry per SAVE_RETRY_DELAY_MS for the dirty tab.
		expect(writeCalls - before).toBe(1);
	});
});
