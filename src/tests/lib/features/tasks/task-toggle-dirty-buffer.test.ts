import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Fake disk + fake Rust side. `toggle_task_status` mirrors
 * `toggle_task_status_inner` (src-tauri/src/commands/vault.rs): it reads the
 * file from DISK, writes the `target` char into the `[ ]` marker on the
 * 1-based line, writes it back and returns the toggled text.
 * `get_all_vault_entries_v2` parses the task lines of every file on the disk
 * at the time of the call.
 */
const disk = new Map<string, string>();

/** Whether a prompt index refresh was requested, as seen inside the preflight save and the toggle command. */
const flagSeen: { save: boolean[]; toggle: boolean[] } = { save: [], toggle: [] };

/** Reads the prompt refresh flag without consuming it. */
function peekPromptRefresh(): boolean {
	const requested = vaultStore.takePromptIndexRefresh();
	if (requested) vaultStore.requestPromptIndexRefresh();
	return requested;
}

/** The snapshot entries of the fake disk: one per file, a todo or done task per `- [ ]` / `- [x]` line. */
function entriesOnDisk() {
	return [...disk].map(([path, content]) => ({
		path,
		title: path.split('/').pop()!.replace(/\.md$/, ''),
		frontmatter: {},
		outgoingLinks: [],
		tags: [],
		modifiedAt: 0,
		createdAt: 0,
		size: 0,
		wordCount: 0,
		snippet: '',
		tasks: content.split('\n').flatMap((line, i) => {
			const m = /^(\s*)[-*+] \[(.)\] (.*)$/.exec(line);
			if (!m) return [];
			const status = m[2] === ' ' ? 'todo' : 'done';
			return [{ text: m[3], checked: status !== 'todo', indent: 0, lineNumber: i + 1, status, metadata: { description: m[3], tags: [] } }];
		}),
		isA: null,
		organized: false,
		archived: false,
		favorite: false,
		belongsTo: [],
		relatedTo: [],
		hasMany: [],
		relationships: {},
	}));
}

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(async (cmd: string, args?: Record<string, unknown>) => {
		if (cmd === 'toggle_task_status') {
			flagSeen.toggle.push(peekPromptRefresh());
			const path = args!.path as string;
			const line = args!.lineNumber as number;
			const original = disk.get(path) ?? '';
			const lines = original.split('\n');
			const target = lines[line - 1] ?? '';
			const char = args!.target === 'done' ? 'x' : ' ';
			const toggled = target.replace(/^(\s*[-*+] \[)( )(\])/, `$1${char}$3`);
			lines[line - 1] = toggled;
			const updated = lines.join('\n');
			if (updated === original) {
				return { updatedContent: original, updateResult: { changed: false, version: 1, upserted: [], removed: [], fullRescan: false }, stale: false };
			}
			disk.set(path, updated);
			return { updatedContent: updated, updateResult: { changed: true, version: 2, upserted: [path], removed: [], fullRescan: false }, stale: false };
		}
		if (cmd === 'get_all_vault_entries_v2') return entriesOnDisk();
		return undefined;
	}),
}));

vi.mock('@tauri-apps/plugin-fs', () => ({
	readTextFile: vi.fn(async (p: string) => disk.get(p) ?? ''),
	writeTextFile: vi.fn(async (p: string, c: string) => {
		flagSeen.save.push(peekPromptRefresh());
		disk.set(p, c);
	}),
}));

vi.mock('@tauri-apps/plugin-dialog', () => ({
	ask: vi.fn(async () => true),
}));

vi.mock('svelte-sonner', () => ({
	toast: { error: vi.fn(), info: vi.fn() },
}));

import { invoke } from '@tauri-apps/api/core';
import { writeTextFile } from '@tauri-apps/plugin-fs';
import { toast } from 'svelte-sonner';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { onContentChange, resetEditor } from '#lib/core/editor/editor.service.js';
import { invalidateVaultEntries } from '#lib/core/vault/vault-entries.service.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { buildTaskIndex, openTasksTab, resetTasks, toggleTask } from '#lib/features/tasks/tasks.service.js';
import { tasksStore } from '#lib/features/tasks/tasks.store.svelte.js';
import type { TaskItem } from '#lib/features/tasks/tasks.types.js';

const NOTE = '/vault/note.md';
const SAVED = '# Groceries\n- [ ] buy milk\n';
const TYPED = '# Groceries\n- [ ] buy milk\nA paragraph the user just typed.\n';
/** "buy milk" as the Tasks list holds it (line 2 of SAVED). */
const BUY_MILK: TaskItem = {
	text: 'buy milk',
	checked: false,
	indent: 0,
	lineNumber: 2,
	status: 'todo',
	metadata: { description: 'buy milk', tags: [] },
};

function noteTab() {
	return editorStore.tabs.find((t) => t.path === NOTE)!;
}

function toggleCalls() {
	return vi.mocked(invoke).mock.calls.filter(([cmd]) => cmd === 'toggle_task_status');
}

describe('toggleTask on a note with unsaved edits', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.clearAllMocks();
		disk.clear();
		flagSeen.save = [];
		flagSeen.toggle = [];
		resetTasks();
		invalidateVaultEntries();
		tasksStore.setSectionTag('');
		editorStore.reset();
		disk.set(NOTE, SAVED);
		editorStore.addTab({ path: NOTE, name: 'note', content: SAVED, savedContent: SAVED });
	});

	afterEach(() => {
		resetEditor();
		vaultStore.takePromptIndexRefresh();
		vi.useRealTimers();
	});

	it('keeps the typed text in the tab and on disk after ticking a task of that note', async () => {
		// User types in the note (arms the 2 s body autosave).
		onContentChange(TYPED);
		expect(noteTab().content).toBe(TYPED);

		// Switches to the Tasks tab (switchTab / setActiveIndex does not save)
		// and ticks "buy milk" (line 2) before the autosave fires.
		openTasksTab();
		await toggleTask(NOTE, BUY_MILK);

		// Let the pending autosave run.
		await vi.advanceTimersByTimeAsync(2500);

		// The preflight save emits its own index event: the request is made after it.
		expect(flagSeen.save[0]).toBe(false);
		expect(flagSeen.toggle).toEqual([true]);
		const tab = noteTab();
		expect(tab.content).toContain('A paragraph the user just typed.');
		expect(tab.content).toContain('- [x] buy milk');
		expect(tab.content).toBe(tab.savedContent);
		expect(disk.get(NOTE)).toContain('A paragraph the user just typed.');
		expect(disk.get(NOTE)).toContain('- [x] buy milk');
	});

	it('writes nothing and keeps the tab dirty when the pre-save fails', async () => {
		onContentChange(TYPED);
		openTasksTab();
		vi.mocked(writeTextFile).mockRejectedValueOnce(new Error('disk full'));

		await toggleTask(NOTE, BUY_MILK);

		expect(toggleCalls()).toHaveLength(0);
		expect(disk.get(NOTE)).toBe(SAVED);
		const tab = noteTab();
		expect(tab.content).toBe(TYPED);
		expect(tab.savedContent).toBe(SAVED);
		expect(toast.error).toHaveBeenCalledWith('Task not changed: the note could not be saved.');
	});

	it('skips the toggle when the unsaved typing moved the task to another line', async () => {
		// A line typed above the task: line 2 on disk was "buy milk", in the
		// buffer it is the new line, so the Tasks view's line number is stale.
		await buildTaskIndex();
		expect(tasksStore.rows.map((r) => r.lineNumber)).toEqual([2]);
		const shifted = '# Groceries\nA new first line.\n- [ ] buy milk\n';
		onContentChange(shifted);
		openTasksTab();

		await toggleTask(NOTE, tasksStore.rows[0]);

		expect(toggleCalls()).toHaveLength(0);
		// The typing is saved, nothing was toggled.
		expect(disk.get(NOTE)).toBe(shifted);
		expect(noteTab().content).toBe(shifted);
		expect(noteTab().savedContent).toBe(shifted);
		// The list is rebuilt from a fresh snapshot, not the memo the first read
		// primed, so the next click carries the fresh line number.
		expect(tasksStore.rows.map((r) => [r.text, r.lineNumber])).toEqual([['buy milk', 3]]);
		expect(vaultStore.takePromptIndexRefresh()).toBe(false);
		expect(toast.info).toHaveBeenCalledWith('The note changed, so the list was refreshed. Try again.');
	});

	it('skips the toggle when the unsaved typing edited the task line itself', async () => {
		const edited = '# Groceries\n- [ ] buy oat milk\n';
		onContentChange(edited);
		openTasksTab();

		await toggleTask(NOTE, BUY_MILK);

		expect(toggleCalls()).toHaveLength(0);
		expect(disk.get(NOTE)).toBe(edited);
		expect(noteTab().content).toBe(edited);
		expect(noteTab().savedContent).toBe(edited);
		expect(toast.info).toHaveBeenCalledWith('The note changed, so the list was refreshed. Try again.');
	});

	it('does not write before the toggle when the tab is clean', async () => {
		await toggleTask(NOTE, BUY_MILK);

		expect(writeTextFile).not.toHaveBeenCalled();
		expect(toggleCalls()).toHaveLength(1);
		expect(toggleCalls()[0][1]).toEqual({
			path: NOTE,
			lineNumber: 2,
			expectedText: 'buy milk',
			expectedStatus: 'todo',
			target: 'done',
		});
		expect(noteTab().content).toBe('# Groceries\n- [x] buy milk\n');
	});
});
