// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Tauri boundaries only. Stores and the real MarkdownEditor (CodeMirror view,
// update listener, autosave) are used as-is.
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));
vi.mock('@tauri-apps/plugin-fs', () => ({
	readTextFile: vi.fn(),
	writeTextFile: vi.fn(async () => {}),
}));
vi.mock('@tauri-apps/plugin-dialog', () => ({ ask: vi.fn(async () => true) }));
Element.prototype.scrollTo = () => {};

import { mount, unmount, flushSync } from 'svelte';
import { undo } from '@codemirror/commands';
import { invoke } from '@tauri-apps/api/core';
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import type { TaskLineEdits, TaskLinesWriteResult } from '#lib/contracts/index.js';
import MarkdownEditor from '#lib/core/markdown-editor/MarkdownEditor.svelte';
import { NOOP_HOST } from '#lib/core/markdown-editor/editor-host.js';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { findTabIndex, isTabDirty } from '#lib/core/editor/editor.logic.js';
import { resetEditor } from '#lib/core/editor/editor.service.js';
import { resetHooks } from '#lib/core/editor/editor.hooks.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { appBlockLinks, appFencedBlockRenderers } from '#lib/app/editor-host.js';
import { readNoteContent, writeTaskLinesToNote } from '#lib/features/todoist-sync/note-writer.service.js';

const ROOT = '/vault';
const REL = 'Todoist/Inbox.md';
const PATH = `${ROOT}/${REL}`;
const OTHER = `${ROOT}/Other.md`;
const LINE = '- [ ] Buy milk 🆔 td-a';
const DONE = '- [x] Buy milk 🆔 td-a';
const NOTE = `# Inbox\n${LINE}\n`;

const closeA: TaskLineEdits = {
	replace: [{ anchor: 'td-a', expectedLine: LINE, newLine: DONE }],
	insert: [],
	remove: [],
};

let target: HTMLElement | null = null;
let component: Record<string, unknown> | null = null;

function view() {
	const v = editorStore.editorView;
	if (!v) throw new Error('editor view not mounted');
	return v;
}

function doc(): string {
	return view().state.doc.toString();
}

function tab(path: string) {
	return editorStore.tabs[findTabIndex(editorStore.tabs, path)];
}

/** Opens the tabs (the first is active) and mounts the editor on it. */
function openTabs(...tabs: [string, string][]) {
	for (const [path, content] of tabs) {
		editorStore.addTab({ path, name: path.split('/').pop()!, content, savedContent: content });
	}
	editorStore.setActiveIndex(0);
	flushSync();
	target = document.body.appendChild(document.createElement('div'));
	component = mount(MarkdownEditor, {
		target,
		props: { host: NOOP_HOST, renderers: appFencedBlockRenderers, blockLinks: appBlockLinks },
	});
	flushSync();
}

/** A user keystroke inserting `text` at `at`, the way CodeMirror's input handler annotates it. */
function type(text: string, at: number) {
	view().dispatch({ changes: { from: at, insert: text }, userEvent: 'input.type' });
}

describe('writeTaskLinesToNote', () => {
	beforeEach(() => {
		editorStore.reset();
		resetHooks();
		vaultStore.open(ROOT);
		vi.mocked(invoke).mockResolvedValue(undefined);
		flushSync();
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		target?.remove();
		target = null;
		resetEditor();
		resetHooks();
		vaultStore.close();
		vi.useRealTimers();
		vi.mocked(invoke).mockReset();
		vi.mocked(readTextFile).mockReset();
		vi.mocked(writeTextFile).mockClear();
	});

	describe('active tab', () => {
		it('patches the live document in one transaction and autosave persists it', async () => {
			openTabs([PATH, NOTE]);
			vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });

			const out = await writeTaskLinesToNote(ROOT, REL, closeA);

			const updated = `# Inbox\n${DONE}\n`;
			expect(out).toEqual({ kind: 'written', content: updated });
			expect(doc()).toBe(updated);
			expect(tab(PATH).content).toBe(updated);
			expect(isTabDirty(tab(PATH))).toBe(true);
			expect(writeTextFile).not.toHaveBeenCalled();
			expect(invoke).not.toHaveBeenCalledWith('write_task_lines', expect.anything());

			await vi.advanceTimersByTimeAsync(2000);
			expect(writeTextFile).toHaveBeenCalledWith(PATH, updated);
		});

		it('keeps text typed between the read and the write', async () => {
			openTabs([PATH, NOTE]);
			const read = await readNoteContent(ROOT, REL);
			expect(read).toBe(NOTE);
			type('Note: ', 0);

			const out = await writeTaskLinesToNote(ROOT, REL, closeA);

			const updated = `Note: # Inbox\n${DONE}\n`;
			expect(out).toEqual({ kind: 'written', content: updated });
			expect(doc()).toBe(updated);
			expect(tab(PATH).content).toBe(updated);
		});

		it('keeps a keystroke typed right after the write returns control', async () => {
			openTabs([PATH, NOTE]);

			const pending = writeTaskLinesToNote(ROOT, REL, closeA);
			// No await, no effect flush: the next keystroke must land on a doc
			// that already holds the patch, or the tab is rewritten without it.
			type('Hi ', 0);
			await pending;
			flushSync();

			expect(doc()).toBe(`Hi # Inbox\n${DONE}\n`);
			expect(tab(PATH).content).toBe(`Hi # Inbox\n${DONE}\n`);
		});

		it('leaves the sync change out of undo, so Cmd+Z undoes only the user edit', async () => {
			openTabs([PATH, NOTE]);
			type('Note: ', 0);

			await writeTaskLinesToNote(ROOT, REL, closeA);
			undo(view());
			flushSync();

			expect(doc()).toBe(`# Inbox\n${DONE}\n`);
		});

		it('is stale and changes nothing when the user edited the anchored line', async () => {
			openTabs([PATH, NOTE]);
			type(' now', doc().indexOf(' 🆔'));
			const before = doc();

			const out = await writeTaskLinesToNote(ROOT, REL, closeA);

			expect(out).toEqual({ kind: 'stale', stale: { reason: 'lineDiffers', subject: 'td-a' } });
			expect(doc()).toBe(before);
			expect(tab(PATH).content).toBe(before);
		});

		it('is unchanged when the batch leaves the note as it is', async () => {
			openTabs([PATH, NOTE]);

			const out = await writeTaskLinesToNote(ROOT, REL, { replace: [], insert: [], remove: [] });

			expect(out).toEqual({ kind: 'unchanged', content: NOTE });
			expect(isTabDirty(tab(PATH))).toBe(false);
		});

		it('is stale on a CRLF note and changes nothing', async () => {
			const crlf = `# Inbox\r\n${LINE}\r\n`;
			openTabs([PATH, crlf]);

			const out = await writeTaskLinesToNote(ROOT, REL, closeA);

			expect(out).toEqual({ kind: 'stale', stale: { reason: 'crlfLineEndings', subject: '' } });
			expect(tab(PATH).content).toBe(crlf);
		});

		it('patches the tab string during a tab switch, while the view still holds the previous note', async () => {
			openTabs([OTHER, 'Other note\n'], [PATH, NOTE]);
			// No flush: the tab is active but the view has not loaded it yet.
			editorStore.setActiveIndex(findTabIndex(editorStore.tabs, PATH));
			expect(doc()).toBe('Other note\n');

			const out = await writeTaskLinesToNote(ROOT, REL, closeA);
			flushSync();

			const updated = `# Inbox\n${DONE}\n`;
			expect(out).toEqual({ kind: 'written', content: updated });
			expect(doc()).toBe(updated);
			expect(tab(PATH).content).toBe(updated);
			expect(tab(OTHER).content).toBe('Other note\n');
			expect(isTabDirty(tab(OTHER))).toBe(false);

			editorStore.setActiveIndex(findTabIndex(editorStore.tabs, OTHER));
			flushSync();
			expect(doc()).toBe('Other note\n');
			expect(tab(PATH).content).toBe(updated);
		});
	});

	describe('background tab', () => {
		it('patches the tab string, marks it dirty and autosave persists it', async () => {
			openTabs([OTHER, 'Other note\n'], [PATH, NOTE]);
			vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });

			const out = await writeTaskLinesToNote(ROOT, REL, closeA);

			const updated = `# Inbox\n${DONE}\n`;
			expect(out).toEqual({ kind: 'written', content: updated });
			expect(tab(PATH).content).toBe(updated);
			expect(tab(PATH).savedContent).toBe(NOTE);
			expect(isTabDirty(tab(PATH))).toBe(true);
			expect(doc()).toBe('Other note\n');
			expect(writeTextFile).not.toHaveBeenCalled();

			await vi.advanceTimersByTimeAsync(2000);
			expect(writeTextFile).toHaveBeenCalledWith(PATH, updated);
			expect(writeTextFile).not.toHaveBeenCalledWith(OTHER, expect.anything());
		});

		it('keeps unsaved text of the tab and shows the patch when the tab is opened', async () => {
			const unsaved = `Draft\n${NOTE}`;
			openTabs([OTHER, 'Other note\n'], [PATH, NOTE]);
			editorStore.updateTabContentOnly(PATH, unsaved);

			await writeTaskLinesToNote(ROOT, REL, closeA);
			editorStore.setActiveIndex(findTabIndex(editorStore.tabs, PATH));
			flushSync();

			expect(doc()).toBe(`Draft\n# Inbox\n${DONE}\n`);
		});

		it('is stale and leaves the tab clean when the line moved on', async () => {
			openTabs([OTHER, 'Other note\n'], [PATH, `# Inbox\n- [ ] Buy oat milk 🆔 td-a\n`]);

			const out = await writeTaskLinesToNote(ROOT, REL, closeA);

			expect(out).toEqual({ kind: 'stale', stale: { reason: 'lineDiffers', subject: 'td-a' } });
			expect(isTabDirty(tab(PATH))).toBe(false);
		});
	});

	it('routes a note with no tab to the guarded Rust command', async () => {
		const written: TaskLinesWriteResult = {
			outcome: 'written',
			content: `# Inbox\n${DONE}\n`,
			stale: null,
			updateResult: { changed: true, affected: [], version: 2, upserted: [], removed: [], fullRescan: false },
		};
		vi.mocked(invoke).mockImplementation(async (cmd: string) =>
			cmd === 'write_task_lines' ? written : cmd.startsWith('get_') ? [] : undefined
		);

		const out = await writeTaskLinesToNote(ROOT, REL, closeA);

		expect(out).toEqual({ kind: 'written', content: `# Inbox\n${DONE}\n` });
		expect(invoke).toHaveBeenCalledWith('write_task_lines', { vaultRoot: ROOT, relPath: REL, edits: closeA });
	});

	it('refuses a vault root that is not the open vault and leaves the tab alone', async () => {
		openTabs([PATH, NOTE]);

		vaultStore.open('/other-vault');

		await expect(writeTaskLinesToNote(ROOT, REL, closeA)).rejects.toThrow(/not the open vault/);
		expect(doc()).toBe(NOTE);
		expect(tab(PATH).content).toBe(NOTE);
	});

	it('rethrows a batch built wrong and changes nothing', async () => {
		openTabs([PATH, NOTE]);
		const bad: TaskLineEdits = {
			replace: [{ anchor: 'td-a', expectedLine: LINE, newLine: 'x\ny' }],
			insert: [],
			remove: [],
		};

		await expect(writeTaskLinesToNote(ROOT, REL, bad)).rejects.toThrow(/line break/);
		expect(doc()).toBe(NOTE);
	});
});

describe('readNoteContent', () => {
	beforeEach(() => {
		editorStore.reset();
		vaultStore.open(ROOT);
	});

	afterEach(() => {
		editorStore.reset();
		vaultStore.close();
		vi.mocked(readTextFile).mockReset();
	});

	it('prefers the open tab content over disk', async () => {
		vi.mocked(readTextFile).mockResolvedValue('on disk');
		editorStore.addTab({ path: PATH, name: 'Inbox.md', content: 'unsaved', savedContent: 'on disk' });

		expect(await readNoteContent(ROOT, REL)).toBe('unsaved');
		expect(readTextFile).not.toHaveBeenCalled();
	});

	it('reads the note from disk when it has no tab', async () => {
		vi.mocked(readTextFile).mockResolvedValue('on disk');

		expect(await readNoteContent(ROOT, REL)).toBe('on disk');
		expect(readTextFile).toHaveBeenCalledWith(PATH);
	});

	it('rethrows a failed disk read', async () => {
		vi.mocked(readTextFile).mockRejectedValue(new Error('not found'));

		await expect(readNoteContent(ROOT, REL)).rejects.toThrow('not found');
	});
});
