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
import KanbanViewHarness from '../../fixtures/KanbanViewHarness.svelte';
import { kanbanStore } from '#lib/plugins/kanban/kanban.store.svelte.js';
import { parseKanbanBoard, serializeKanbanBoard, toggleItem } from '#lib/plugins/kanban/kanban.logic.js';

interface HarnessApi {
	setMarkdown: (markdown: string) => void;
	getMarkdown: () => string;
	getPersistCount: () => number;
}

const SEED = '## To Do\n\n- [ ] buy eggs\n\n## Done\n\n';

describe('F144: a card edited to hold a newline loses its second line', () => {
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

	it('the text typed after Shift+Enter survives reopen + the next card action', () => {
		component = mount(KanbanViewHarness, {
			target,
			props: { initialMarkdown: SEED, register: (a: HarnessApi) => { api = a; } },
		});
		flushSync();

		// Enter edit mode the way the board does (store-driven editing id).
		const cardEl = document.querySelector<HTMLElement>('[data-item-id]');
		expect(cardEl).not.toBeNull();
		kanbanStore.setEditingItemId?.(cardEl!.dataset.itemId!);
		flushSync();
		let textarea = document.querySelector<HTMLTextAreaElement>('textarea');
		if (!textarea) {
			cardEl!.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
			flushSync();
			textarea = document.querySelector<HTMLTextAreaElement>('textarea');
		}
		expect(textarea, 'card textarea should be open for editing').not.toBeNull();

		// Shift+Enter is not prevented by handleKeydown, so the browser inserts a
		// newline; jsdom does not perform default actions, so set the value it
		// would produce. Then commit with plain Enter.
		const shiftEnter = new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true, bubbles: true, cancelable: true });
		textarea!.dispatchEvent(shiftEnter);
		expect(shiftEnter.defaultPrevented).toBe(false);
		textarea!.value = 'buy eggs\nand milk';
		textarea!.dispatchEvent(new Event('input', { bubbles: true }));
		flushSync();
		textarea!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
		flushSync();

		const written = api!.getMarkdown();
		expect(written).toContain('- [ ] buy eggs\nand milk');

		// Reopen the board from the bytes on disk, then do any card action.
		const reopened = parseKanbanBoard(written);
		const lane = reopened.lanes[0];
		const next = serializeKanbanBoard(toggleItem(reopened, lane.id, lane.items[0].id));
		expect(next).toContain('and milk');
	});
});
