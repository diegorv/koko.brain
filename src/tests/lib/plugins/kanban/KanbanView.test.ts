// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// bits-ui ContextMenu/Popover position via @floating-ui/dom, which needs ResizeObserver.
class ResizeObserverStub {
	observe() {}
	unobserve() {}
	disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;

// Both reach Tauri IPC — legitimately mocked. Stores and kanban.logic stay real
// (CLAUDE.md rule 1): the view is driven through the real board state and the
// rendered DOM, with the harness round-tripping onContentChange.
vi.mock('$lib/core/markdown-editor/extensions/live-preview/wikilink-navigation', () => ({
	openWikilinkTarget: vi.fn(),
}));
vi.mock('$lib/plugins/kanban/kanban.service', () => ({
	loadLinkedFileContent: vi.fn(async () => null),
}));

import { mount, unmount, flushSync } from 'svelte';
import KanbanViewHarness from '../../../fixtures/KanbanViewHarness.svelte';
import { kanbanStore } from '$lib/plugins/kanban/kanban.store.svelte';
import { parseKanbanBoard, serializeKanbanBoard, setViewMode } from '$lib/plugins/kanban/kanban.logic';

interface HarnessApi {
	setMarkdown: (markdown: string) => void;
	getMarkdown: () => string;
	getPersistCount: () => number;
}

/**
 * Canonical seed: already carries `viewMode: "board"`, so clicking the
 * already-active "Board view" button produces a board that serializes to
 * byte-identical markdown — the no-op shape M27 reports.
 */
const SEED = serializeKanbanBoard(
	setViewMode(parseKanbanBoard('## To Do\n\n- [ ] write the test\n\n## Done\n\n'), 'board'),
);

/** An EXTERNAL edit (vault sync / file watcher): different lane title. */
const EXTERNAL = serializeKanbanBoard(
	setViewMode(parseKanbanBoard('## Externally Renamed\n\n- [ ] write the test\n\n## Done\n\n'), 'board'),
);

describe('KanbanView — applyChange no-op guard (M27)', () => {
	let target: HTMLElement;
	let component: Record<string, unknown> | null = null;
	let api: HarnessApi | undefined;

	beforeEach(() => {
		vi.clearAllMocks();
		kanbanStore.reset();
		target = document.body.appendChild(document.createElement('div'));
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		api = undefined;
		document.body.innerHTML = '';
	});

	function mountView(markdown = SEED): void {
		component = mount(KanbanViewHarness, {
			target,
			props: { initialMarkdown: markdown, register: (a: HarnessApi) => { api = a; } },
		});
		flushSync();
	}

	/** Clicks a toolbar button by its `title` attribute. */
	function clickToolbarButton(title: string): void {
		const button = document.querySelector<HTMLButtonElement>(`button[title="${title}"]`);
		if (!button) throw new Error(`toolbar button "${title}" not found`);
		button.click();
		flushSync();
	}

	it('renders the seeded board', () => {
		mountView();
		expect(document.body.textContent).toContain('To Do');
		expect(document.body.textContent).toContain('write the test');
	});

	it('does not persist when the change serializes to identical markdown', () => {
		mountView();
		// The board is already in 'board' view mode, so this re-selection produces
		// a fresh board object whose serialization equals the current markdown.
		clickToolbarButton('Board view');

		expect(api?.getPersistCount()).toBe(0);
		expect(api?.getMarkdown()).toBe(SEED);
	});

	it('still applies the next external reload after a no-op change', () => {
		mountView();
		clickToolbarButton('Board view');

		// Because the no-op persist never reaches the parent, the prop never
		// round-trips and the selfUpdate latch must NOT be left armed — otherwise
		// this external reload is swallowed and the board renders stale.
		api?.setMarkdown(EXTERNAL);
		flushSync();

		expect(document.body.textContent).toContain('Externally Renamed');
		expect(document.body.textContent).not.toContain('To Do');
	});

	it('still persists and swallows the round-trip for a real change', () => {
		mountView();
		clickToolbarButton('List view');

		expect(api?.getPersistCount()).toBe(1);
		expect(api?.getMarkdown()).toContain('"viewMode": "list"');
	});
});
