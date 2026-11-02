// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('svelte-sonner', () => ({
	toast: { error: vi.fn(), success: vi.fn() },
}));

// The system clipboard is a side-effect boundary.
const writeText = vi.fn((_text: string) => Promise.resolve());
Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
// jsdom has no scrolling; the editor restores a remounted tab's scroll position.
Element.prototype.scrollTo = () => {};

import { mount, unmount, flushSync } from 'svelte';
import MarkdownEditor from '#lib/core/markdown-editor/MarkdownEditor.svelte';
import { NOOP_HOST } from '#lib/core/markdown-editor/editor-host.js';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { collectionStore } from '#lib/features/collection/collection.store.svelte.js';
import type { PropertyIndexRecord } from '#lib/features/collection/collection.types.js';
import { appBlockLinks, appFencedBlockRenderers } from '#lib/app/editor-host.js';

/**
 * The mounted editor with the app's real renderers and store: the collection
 * placeholder and the context menu are checked on the rendered DOM.
 */

const PATH = '/vault/Note.md';
const COLLECTION_DOC = 'Intro\n\n```collection\nviews:\n  - type: table\n    name: T\n```\n\nEnd\n';

let target: HTMLElement;
let component: Record<string, unknown> | null = null;

function record(path: string): PropertyIndexRecord {
	const name = path.split('/').pop()!;
	return {
		path,
		name,
		basename: name.replace(/\.md$/, ''),
		folder: path.slice(0, path.lastIndexOf('/')),
		ext: '.md',
		mtime: 0,
		ctime: 0,
		size: 0,
		properties: new Map(),
	};
}

function render(content: string) {
	editorStore.addTab({ path: PATH, name: 'Note.md', content, savedContent: content });
	target = document.body.appendChild(document.createElement('div'));
	component = mount(MarkdownEditor, { target, props: { host: NOOP_HOST, renderers: appFencedBlockRenderers, blockLinks: appBlockLinks } });
	flushSync();
}

function collectionBlockText(): string {
	return target.querySelector('.cm-lp-collection-block')?.textContent ?? '';
}

/** Lets the async copy settle. */
async function settle(): Promise<void> {
	for (let i = 0; i < 10; i++) await Promise.resolve();
	flushSync();
}

/** Right-clicks the first line and clicks the context-menu item named `label`. */
async function clickMenuItem(label: string): Promise<void> {
	const surface = target.querySelector('.absolute.inset-0')!;
	surface.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 1, clientY: 1 }));
	flushSync();
	await settle();
	const item = [...document.body.querySelectorAll('[data-slot="context-menu-item"]')].find((el) =>
		el.textContent?.includes(label),
	) as HTMLElement | undefined;
	if (!item) throw new Error(`No context-menu item "${label}"`);
	item.click();
	await settle();
}

describe('MarkdownEditor', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		editorStore.reset();
		collectionStore.reset();
		flushSync();
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		target?.remove();
	});

	describe('collection placeholders', () => {
		it('replace "Building index..." once the index becomes ready', () => {
			render(COLLECTION_DOC);
			expect(collectionBlockText()).toContain('Building index...');

			collectionStore.setPropertyIndex(new Map());
			flushSync();

			expect(collectionBlockText()).not.toContain('Building index...');
			expect(collectionBlockText()).toContain('T (0)');
		});

		it('re-render when the ready index changes in another note', () => {
			collectionStore.setPropertyIndex(new Map());
			render(COLLECTION_DOC);
			expect(collectionBlockText()).toContain('T (0)');

			collectionStore.updateRecord('/vault/Other.md', record('/vault/Other.md'));
			flushSync();

			expect(collectionBlockText()).toContain('T (1)');
		});
	});

	describe('context menu', () => {
		it('Copy link to block adds a block id and copies the link', async () => {
			render('First paragraph\n');

			await clickMenuItem('Copy link to block');

			expect(writeText).toHaveBeenCalledTimes(1);
			const link = writeText.mock.calls[0][0];
			expect(link).toMatch(/^\[\[Note#\^[\w-]+\]\]$/);
			const id = link.slice('[[Note#^'.length, -2);
			expect(editorStore.editorView?.state.doc.toString()).toBe(`First paragraph ^${id}\n`);
		});

		it('Copy block embed copies the embed of the block', async () => {
			render('First paragraph ^abc123\n');

			await clickMenuItem('Copy block embed');

			expect(writeText).toHaveBeenCalledWith('![[Note#^abc123]]');
		});
	});
});
