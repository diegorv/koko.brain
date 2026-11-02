// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

class ResizeObserverStub {
	observe() {}
	unobserve() {}
	disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;

vi.mock('#lib/plugins/kanban/kanban.service.js', () => ({
	loadLinkedFileContent: vi.fn(async () => null),
}));

import { mount, unmount, flushSync } from 'svelte';
import KanbanViewHarness from '../../../fixtures/KanbanViewHarness.svelte';
import { kanbanStore } from '#lib/plugins/kanban/kanban.store.svelte.js';
import { parseKanbanBoard, serializeKanbanBoard, toggleItem } from '#lib/plugins/kanban/kanban.logic.js';

interface HarnessApi {
	setMarkdown: (markdown: string) => void;
	getMarkdown: () => string;
	getPersistCount: () => number;
}

const SEED = '## To Do\n\n- [ ] buy eggs\n\n## Done\n\n';

describe('F144: card text is single-line, so a newline never reaches the file as a bare line', () => {
	let target: HTMLElement;
	let component: Record<string, unknown> | null = null;
	let api: HarnessApi | undefined;

	beforeEach(() => {
		kanbanStore.reset();
		target = document.body.appendChild(document.createElement('div'));
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		api = undefined;
		document.body.innerHTML = '';
	});

	function openEditor(): HTMLTextAreaElement {
		component = mount(KanbanViewHarness, {
			target,
			props: { initialMarkdown: SEED, register: (a: HarnessApi) => { api = a; } },
		});
		flushSync();
		const cardEl = document.querySelector<HTMLElement>('[data-item-id]');
		expect(cardEl).not.toBeNull();
		kanbanStore.setEditingItemId(cardEl!.dataset.itemId!);
		flushSync();
		const textarea = document.querySelector<HTMLTextAreaElement>('textarea');
		expect(textarea, 'card textarea should be open for editing').not.toBeNull();
		return textarea!;
	}

	function commitWithEnter(textarea: HTMLTextAreaElement) {
		textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
		flushSync();
	}

	/** Reopens the board from the written bytes and does one card action. */
	function reopenAndToggle(written: string): string {
		const reopened = parseKanbanBoard(written);
		expect(reopened.lanes.map((l) => l.title)).toEqual(['To Do', 'Done']);
		const lane = reopened.lanes[0];
		expect(lane.items).toHaveLength(1);
		return serializeKanbanBoard(toggleItem(reopened, lane.id, lane.items[0].id));
	}

	it('Shift+Enter inserts no newline: the key is prevented and the card stays open', () => {
		const textarea = openEditor();
		const shiftEnter = new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true, bubbles: true, cancelable: true });
		textarea.dispatchEvent(shiftEnter);
		flushSync();
		expect(shiftEnter.defaultPrevented).toBe(true);
		expect(api!.getPersistCount()).toBe(0);
		expect(document.querySelector('textarea')).not.toBeNull();
	});

	it('a multi-line paste is committed as one card that survives reopen + the next card action', () => {
		const textarea = openEditor();
		// jsdom does not perform the paste; set the value the browser would produce.
		textarea.value = 'buy eggs\r\nand milk\n## not a lane';
		textarea.dispatchEvent(new Event('input', { bubbles: true }));
		flushSync();
		commitWithEnter(textarea);

		const written = api!.getMarkdown();
		expect(written).toContain('- [ ] buy eggs and milk ## not a lane\n');
		const next = reopenAndToggle(written);
		expect(next).toContain('- [x] buy eggs and milk ## not a lane\n');
	});
});
