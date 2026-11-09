// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupLocalStorage, clearLocalStorage } from '../../../fixtures/localStorage.fixture';

setupLocalStorage();

// ScrollArea (bits-ui) observes its viewport size.
class ResizeObserverStub {
	observe() {}
	unobserve() {}
	disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;

// Tauri IPC and the disk are mocked; tasksStore and editorStore stay real
// (CLAUDE.md rule 1).
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));
vi.mock('@tauri-apps/api/event', () => ({ listen: vi.fn(() => Promise.resolve(vi.fn())), emit: vi.fn() }));
vi.mock('@tauri-apps/plugin-fs', () => ({ readTextFile: vi.fn(), writeTextFile: vi.fn() }));

import { mount, unmount, flushSync } from 'svelte';
import { invoke } from '@tauri-apps/api/core';
import { readTextFile } from '@tauri-apps/plugin-fs';
import TasksView from '#lib/features/tasks/TasksView.svelte';
import { tasksStore } from '#lib/features/tasks/tasks.store.svelte.js';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import type { FileTaskGroupV2 } from '#lib/types/vault-v2.types.js';
import type { TaskStatus } from '#lib/features/tasks/task-metadata.types.js';

const NOTE = '/vault/Projects/2026-Q2.md';

function group(text: string, lineNumber: number, status: TaskStatus = 'todo'): FileTaskGroupV2 {
	return {
		filePath: NOTE,
		fileName: '2026-Q2',
		modifiedAt: 1_700_000_000,
		tasks: [{
			text,
			checked: status !== 'todo',
			indent: 0,
			lineNumber,
			status,
			metadata: { description: text, tags: [] },
		}],
	};
}

function toggleCalls() {
	return vi.mocked(invoke).mock.calls.filter(([cmd]) => cmd === 'toggle_task_status');
}

describe('TasksView row clicks', () => {
	let target: HTMLElement;
	let component: Record<string, unknown> | null = null;
	let onOpenWikilink: ReturnType<typeof vi.fn<(target: string) => void>>;

	beforeEach(() => {
		vi.clearAllMocks();
		clearLocalStorage();
		tasksStore.reset();
		editorStore.reset();
		tasksStore.setSectionTag('');
		onOpenWikilink = vi.fn<(target: string) => void>();
		target = document.body.appendChild(document.createElement('div'));
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		window.getSelection()?.removeAllRanges();
		document.body.innerHTML = '';
	});

	/** Mounts the view with one task on `lineNumber` (1-based), preceded by blank lines. */
	async function mountView(text: string, lineNumber = 1, status: TaskStatus = 'todo'): Promise<void> {
		vi.mocked(readTextFile).mockResolvedValue(`${'\n'.repeat(lineNumber - 1)}- [ ] ${text}\n`);
		vi.mocked(invoke).mockImplementation(async (cmd: string) => {
			if (cmd === 'get_all_tasks_v2') return [group(text, lineNumber, status)];
			if (cmd === 'toggle_task_status') {
				return { updatedContent: '', updateResult: { changed: false, version: 1, upserted: [], removed: [], fullRescan: false }, stale: false };
			}
			return undefined;
		});
		component = mount(TasksView, { target, props: { onOpenWikilink } });
		flushSync();
		await vi.waitFor(() => {
			flushSync();
			if (!document.querySelector('[data-task-row]')) throw new Error('task row not rendered');
		});
	}

	/** The span holding the task's text inside its row. */
	function textSpan(): HTMLElement {
		const span = document.querySelector<HTMLElement>('[data-task-row] span');
		if (!span) throw new Error('task text span not found');
		return span;
	}

	it('opens the note at the task line when the text is clicked, without toggling', async () => {
		// Line 3 after two blank lines starts at offset 2, so a plain open
		// (no caret move) cannot pass.
		await mountView('Ship feature A', 3);
		expect(textSpan().textContent).toContain('Ship feature A');

		textSpan().click();
		await vi.waitFor(() => expect(editorStore.activeTabPath).toBe(NOTE));
		await vi.waitFor(() => expect(editorStore.pendingScrollPosition).toBe(2));

		expect(toggleCalls()).toHaveLength(0);
	});

	it('toggles the task when the circle is clicked', async () => {
		await mountView('Ship feature A');

		const circle = document.querySelector<HTMLButtonElement>('[data-task-row] button[aria-label="Mark task as done"]');
		if (!circle) throw new Error('circle button not found');
		circle.click();

		await vi.waitFor(() => expect(toggleCalls()).toHaveLength(1));
		expect(toggleCalls()[0][1]).toEqual({
			path: NOTE,
			lineNumber: 1,
			expectedText: 'Ship feature A',
			expectedStatus: 'todo',
			target: 'done',
		});
	});

	/** The circle button of the only row. */
	function circleButton(): HTMLButtonElement {
		const button = document.querySelector<HTMLButtonElement>('[data-task-row] button');
		if (!button) throw new Error('circle button not found');
		return button;
	}

	it('shows the open circle and "Mark task as done" for an important task, which a click completes', async () => {
		// "Hide completed" hides every checked row, `[!]` included.
		tasksStore.setHideCompleted(false);
		await mountView('call', 1, 'important');

		// The open `Circle` icon draws a <circle>; `CircleCheckBig` draws paths only.
		expect(circleButton().getAttribute('aria-label')).toBe('Mark task as done');
		expect(circleButton().querySelector('svg circle')).not.toBeNull();

		circleButton().click();
		await vi.waitFor(() => expect(toggleCalls()).toHaveLength(1));
		expect(toggleCalls()[0][1]).toMatchObject({ expectedStatus: 'important', target: 'done' });
	});

	it('shows the ticked circle and "Mark task as not done" for a done task', async () => {
		tasksStore.setHideCompleted(false);
		await mountView('call', 1, 'done');

		expect(circleButton().getAttribute('aria-label')).toBe('Mark task as not done');
		expect(circleButton().querySelector('svg circle')).toBeNull();
	});

	it('does nothing when the click ends a text selection inside the text', async () => {
		await mountView('Ship feature A');
		const span = textSpan();
		const range = document.createRange();
		range.selectNodeContents(span);
		window.getSelection()!.addRange(range);

		span.click();
		await new Promise((r) => setTimeout(r, 0));
		flushSync();

		expect(editorStore.tabs).toHaveLength(0);
		expect(editorStore.activeTabPath).toBeNull();
		expect(toggleCalls()).toHaveLength(0);
	});

	it('opens a wikilink in the text without opening the note or toggling', async () => {
		await mountView('see [[Welcome]]');
		const link = Array.from(textSpan().querySelectorAll('button')).find((b) => b.textContent === 'Welcome');
		if (!link) throw new Error('wikilink button not found');

		link.click();
		await new Promise((r) => setTimeout(r, 0));
		flushSync();

		expect(onOpenWikilink).toHaveBeenCalledWith('Welcome');
		expect(editorStore.tabs.some((t) => t.path === NOTE)).toBe(false);
		expect(toggleCalls()).toHaveLength(0);
	});
});
