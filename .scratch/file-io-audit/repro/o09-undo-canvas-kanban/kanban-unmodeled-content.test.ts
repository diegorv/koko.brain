// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

class ResizeObserverStub {
	observe() {}
	unobserve() {}
	disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;

// Same boundary the repo's KanbanView test mocks (Tauri IPC behind it).
vi.mock('#lib/plugins/kanban/kanban.service.js', () => ({
	loadLinkedFileContent: vi.fn(async () => null),
}));

import { mount, unmount, flushSync } from 'svelte';
import KanbanViewHarness from '../../fixtures/KanbanViewHarness.svelte';
import { kanbanStore } from '#lib/plugins/kanban/kanban.store.svelte.js';
import { parseKanbanBoard } from '#lib/plugins/kanban/kanban.logic.js';

interface HarnessApi {
	setMarkdown: (markdown: string) => void;
	getMarkdown: () => string;
	getPersistCount: () => number;
}

let target: HTMLElement;
let component: Record<string, unknown> | null = null;
let api: HarnessApi | undefined;

function mountView(markdown: string) {
	component = mount(KanbanViewHarness, {
		target,
		props: { initialMarkdown: markdown, register: (a: HarnessApi) => { api = a; } },
	});
	flushSync();
}

/** One board action the user takes: switch the board to list view. */
function doBoardAction() {
	const button = document.querySelector<HTMLButtonElement>('button[title="List view"]');
	if (!button) throw new Error('List view button not found');
	button.click();
	flushSync();
	expect(api!.getPersistCount()).toBe(1);
}

describe('o09 kanban: board actions must not drop content the board does not model', () => {
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

	it('keeps prose, sub-headings, indented lines and other task states', () => {
		const md = [
			'## To Do',
			'',
			'Prose the user typed in source mode.',
			'### Sub heading',
			'- [ ] Card one',
			'    indented detail of card one',
			'- [/] Half-done card',
			'',
			'## Done',
			'',
			'- [x] Card two',
			'',
		].join('\n');
		mountView(md);
		doBoardAction();
		const out = api!.getMarkdown();
		expect(out).toContain('Prose the user typed in source mode.');
		expect(out).toContain('### Sub heading');
		expect(out).toContain('indented detail of card one');
		expect(out).toContain('Half-done card');
	});

	it('a CRLF board keeps its lanes and cards', () => {
		const md = '## To Do\r\n\r\n- [ ] Card one\r\n- [ ] Card two\r\n\r\n## Done\r\n\r\n- [x] Card three\r\n';
		mountView(md);
		doBoardAction();
		const out = api!.getMarkdown();
		expect(out).toContain('Card one');
		expect(out).toContain('Card three');
		expect(parseKanbanBoard(md).lanes.map((l) => l.title)).toEqual(['To Do', 'Done']);
	});

	it('a board with frontmatter keeps the frontmatter and its lanes', () => {
		const md = '---\ntags: [work]\n---\n\n## To Do\n\n- [ ] Card one\n\n## Done\n\n- [x] Card two\n';
		mountView(md);
		doBoardAction();
		const out = api!.getMarkdown();
		expect(out).toContain('tags: [work]');
		expect(out).toMatch(/## To Do\n\n- \[ \] Card one/);
		expect(parseKanbanBoard(md).lanes.map((l) => l.title)).toEqual(['To Do', 'Done']);
	});
});
