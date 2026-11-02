// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

class ResizeObserverStub {
	observe() {}
	unobserve() {}
	disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;

// Only the Tauri-backed linked-file loader is mocked; kanban.logic and the
// kanban store stay real.
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

/** A board as a user would leave it after typing in source mode. */
const SOURCE_EDITED = [
	'## To Do',
	'',
	'Notes for today: call the plumber before noon.',
	'',
	'- [ ] write the test',
	'- [-] cancelled item',
	'* [ ] star bullet item',
	'',
	'## Done',
	'',
].join('\n');

describe('F143: kanban mutation drops lines the parser does not model', () => {
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

	it('toggling one card through the real board UI keeps the paragraph and other list lines', () => {
		component = mount(KanbanViewHarness, {
			target,
			props: { initialMarkdown: SOURCE_EDITED, register: (a: HarnessApi) => { api = a; } },
		});
		flushSync();

		const check = document.querySelector<HTMLButtonElement>('button[aria-label="Check"]');
		expect(check).not.toBeNull();
		check!.click();
		flushSync();

		expect(api?.getPersistCount()).toBe(1);
		const written = api!.getMarkdown();
		// Sanity: the toggle itself landed.
		expect(written).toContain('- [x] write the test');
		// The bug: everything the parser does not model is gone from the bytes
		// handed to the tab autosave.
		expect(written).toContain('Notes for today: call the plumber before noon.');
		expect(written).toContain('cancelled item');
		expect(written).toContain('star bullet item');
	});

	it('a "---" line between lanes does not swallow the lanes after it (logic round-trip)', () => {
		const md = '## A\n\n- [ ] a1\n\n---\n\n## B\n\n- [ ] b1\n';
		const board = parseKanbanBoard(md);
		const out = serializeKanbanBoard(toggleItem(board, board.lanes[0].id, board.lanes[0].items[0].id));
		expect(out).toContain('## B');
	});
});
