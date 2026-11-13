// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import { fsStore } from '#lib/core/filesystem/fs.store.svelte.js';
import type { FileTreeNode } from '#lib/core/filesystem/fs.types.js';
import KanbanWikilinkSuggestions from '#lib/plugins/kanban/KanbanWikilinkSuggestions.svelte';

const file = (path: string): FileTreeNode => ({ name: path.split('/').pop()!, path, isDirectory: false });

describe('KanbanWikilinkSuggestions', () => {
	let component: Record<string, unknown> | null = null;

	beforeEach(() => {
		fsStore.reset();
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
	});

	/** The note names suggested while typing `text` with the cursor at its end. */
	function suggested(text: string): string[] {
		const target = document.body.appendChild(document.createElement('div'));
		component = mount(KanbanWikilinkSuggestions, { target, props: { text, cursorPos: text.length, onSelect: () => {} } });
		flushSync();
		return [...target.querySelectorAll('button span')].map((el) => el.textContent ?? '');
	}

	it('suggests notes but never a view, which no link can target', () => {
		fsStore.setFileTree([file('/vault/Projects.md'), file('/vault/Views/Projects.view'), file('/vault/Views/Board.VIEW')]);

		expect(suggested('see [[Pro')).toEqual(['Projects']);
	});

	it('suggests nothing outside a wikilink or with an empty tree', () => {
		fsStore.setFileTree([file('/vault/Projects.md')]);
		expect(suggested('see Pro')).toEqual([]);

		fsStore.setFileTree([]);
		expect(suggested('see [[Pro')).toEqual([]);
	});
});
