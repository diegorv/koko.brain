// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { EditorView } from '@codemirror/view';
import { undoDepth } from '@codemirror/commands';

import { NOOP_HOST, type EditorHost } from '#lib/core/markdown-editor/editor-host.js';
import type { FileEntry } from '#lib/core/filesystem/file-entries.logic.js';
import { createComposerEditor, setComposerDark, setComposerText } from '#lib/plugins/quick-capture/composer-editor.js';
import { entryV2 } from '../../../fixtures/vault-entries.fixture';

const FILES: FileEntry[] = [
	{ name: 'Welcome.md', nameWithoutExt: 'Welcome', path: '/vault/Welcome.md' },
	{ name: 'Weekly.md', nameWithoutExt: 'Weekly', path: '/vault/Weekly.md' },
];

/** A host with two notes (Welcome aliased Home) and two tags. */
function vaultHost(): EditorHost {
	return {
		...NOOP_HOST,
		listTags: vi.fn(() => Promise.resolve([
			{ name: 'project', count: 2 },
			{ name: 'prose', count: 5 },
		])),
		listLinkCandidates: vi.fn((includeNotes: boolean) => Promise.resolve({
			files: FILES,
			notes: includeNotes ? [entryV2('/vault/Welcome.md', { frontmatter: { aliases: ['Home'] } })] : [],
		})),
	};
}

const views: EditorView[] = [];
const windowListeners: Array<(e: KeyboardEvent) => void> = [];

afterEach(() => {
	for (const v of views.splice(0)) v.destroy();
	for (const l of windowListeners.splice(0)) window.removeEventListener('keydown', l);
	document.body.innerHTML = '';
	vi.restoreAllMocks();
});

function mount(doc = '', host: EditorHost = vaultHost()) {
	const onDocChange = vi.fn();
	const onEscape = vi.fn();
	const view = createComposerEditor({
		parent: document.body.appendChild(document.createElement('div')),
		doc,
		host,
		dark: false,
		onDocChange,
		onEscape,
	});
	views.push(view);
	return { view, onDocChange, onEscape };
}

/** Types `text` one character at a time at the cursor, as the keyboard does. */
function typeText(view: EditorView, text: string) {
	for (const ch of text) {
		const at = view.state.selection.main.head;
		view.dispatch({ changes: { from: at, insert: ch }, selection: { anchor: at + 1 }, userEvent: 'input.type' });
	}
}

function press(view: EditorView, key: string, mods: KeyboardEventInit = {}): KeyboardEvent {
	const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...mods });
	view.contentDOM.dispatchEvent(event);
	return event;
}

function listShown(view: EditorView): boolean {
	return view.dom.querySelector('.cm-tooltip-autocomplete') !== null;
}

function listLabels(view: EditorView): string[] {
	return Array.from(view.dom.querySelectorAll('.cm-tooltip-autocomplete li')).map((li) => li.textContent ?? '');
}

/** Waits for the list typing opened, then past the 75 ms interaction delay so Enter accepts. */
async function waitForList(view: EditorView) {
	await vi.waitFor(() => expect(listShown(view)).toBe(true));
	await new Promise((resolve) => setTimeout(resolve, 100));
}

function spyWindowKeydown() {
	const spy = vi.fn();
	windowListeners.push(spy);
	window.addEventListener('keydown', spy);
	return spy;
}

describe('createComposerEditor', () => {
	describe('completion while typing', () => {
		it('opens the note list on [[ and accepts with Enter, adding the closing brackets', async () => {
			const { view } = mount();
			typeText(view, 'see [[Welc');
			await waitForList(view);
			expect(listLabels(view)[0]).toContain('Welcome');

			press(view, 'Enter');

			expect(view.state.doc.toString()).toBe('see [[Welcome]]');
			expect(view.state.selection.main.head).toBe('see [[Welcome]]'.length);
		});

		it('does not add a second ]] when one follows the cursor', async () => {
			const { view } = mount(']]');
			view.dispatch({ selection: { anchor: 0 } });
			typeText(view, '[[Welc');
			await waitForList(view);

			press(view, 'Enter');

			expect(view.state.doc.toString()).toBe('[[Welcome]]');
		});

		it('inserts an alias as Note|alias', async () => {
			const { view } = mount();
			typeText(view, '[[Hom');
			await waitForList(view);
			expect(listLabels(view).some((l) => l.includes('Home'))).toBe(true);

			press(view, 'Enter');

			expect(view.state.doc.toString()).toBe('[[Welcome|Home]]');
		});

		it('opens the tag list on # and accepts the tag', async () => {
			const { view } = mount();
			typeText(view, 'see #proj');
			await waitForList(view);

			press(view, 'Enter');

			expect(view.state.doc.toString()).toBe('see #project');
		});

		it('offers no date shortcut and does not close brackets', async () => {
			const { view } = mount();
			typeText(view, '@today [');
			await new Promise((resolve) => setTimeout(resolve, 250));

			expect(listShown(view)).toBe(false);
			expect(view.state.doc.toString()).toBe('@today [');
		});

		it('types on without a list when the host has nothing', async () => {
			const { view } = mount('', NOOP_HOST);
			typeText(view, '[[W #p');
			await new Promise((resolve) => setTimeout(resolve, 250));

			expect(listShown(view)).toBe(false);
			press(view, 'Enter');
			expect(view.state.doc.toString()).toBe('[[W #p\n');
		});
	});

	describe('Escape', () => {
		it('closes an open list without dismissing the composer', async () => {
			const { view, onEscape } = mount();
			const windowKeydown = spyWindowKeydown();
			typeText(view, '#pro');
			await waitForList(view);

			press(view, 'Escape');

			expect(listShown(view)).toBe(false);
			expect(onEscape).not.toHaveBeenCalled();
			expect(windowKeydown).not.toHaveBeenCalled();
			expect(view.state.doc.toString()).toBe('#pro');
		});

		it('closes the list, not the composer, right after another keystroke', async () => {
			const { view, onEscape } = mount();
			typeText(view, '#pr');
			await waitForList(view);

			typeText(view, 'o');
			expect(listShown(view)).toBe(true);
			press(view, 'Escape');

			expect(listShown(view)).toBe(false);
			expect(onEscape).not.toHaveBeenCalled();
		});

		it('dismisses the composer when no list is open, once', () => {
			const { view, onEscape } = mount('an idea');
			const windowKeydown = spyWindowKeydown();

			press(view, 'Escape');

			expect(onEscape).toHaveBeenCalledTimes(1);
			expect(windowKeydown).not.toHaveBeenCalled();
		});

		it('dismisses right after typing that opened no list', () => {
			const { view, onEscape } = mount();
			typeText(view, 'abc');

			press(view, 'Escape');

			expect(onEscape).toHaveBeenCalledTimes(1);
		});

		it('takes a second Escape to dismiss after closing a list', async () => {
			const { view, onEscape } = mount();
			typeText(view, '#pro');
			await waitForList(view);

			press(view, 'Escape');
			press(view, 'Escape');

			expect(onEscape).toHaveBeenCalledTimes(1);
		});
	});

	describe('other keys', () => {
		it('leaves Ctrl+Enter to the window, with or without a list', async () => {
			const { view } = mount();
			const windowKeydown = spyWindowKeydown();
			typeText(view, '#pro');
			await waitForList(view);

			// jsdom is not macOS, so CodeMirror's `Mod` is Ctrl here.
			const event = press(view, 'Enter', { ctrlKey: true });

			expect(event.defaultPrevented).toBe(false);
			expect(windowKeydown).toHaveBeenCalledTimes(1);
			expect(view.state.doc.toString()).toBe('#pro');
		});

		it('inserts a plain newline with Enter and Shift+Enter, without copying the indent', () => {
			const { view } = mount('  a');
			view.dispatch({ selection: { anchor: 3 } });

			press(view, 'Enter');
			press(view, 'Enter', { shiftKey: true });

			expect(view.state.doc.toString()).toBe('  a\n\n');
		});

		it('undoes typing with Ctrl+Z and redoes with Ctrl+Y', () => {
			const { view } = mount();
			typeText(view, 'idea');

			press(view, 'z', { ctrlKey: true });
			expect(view.state.doc.toString()).toBe('');

			press(view, 'y', { ctrlKey: true });
			expect(view.state.doc.toString()).toBe('idea');
		});

		it('does not take Ctrl+U (undo selection), which a text field lacks', () => {
			const { view } = mount('idea');

			expect(press(view, 'u', { ctrlKey: true }).defaultPrevented).toBe(false);
		});
	});

	describe('setup', () => {
		it('labels the field and names its placeholder for screen readers', () => {
			const { view } = mount();

			expect(view.contentDOM.getAttribute('aria-label')).toBe('Quick capture composer');
			expect(view.contentDOM.getAttribute('aria-placeholder')).toBe('Quick capture...');
			expect(view.contentDOM.getAttribute('spellcheck')).toBe('false');
		});

		it('reports every change synchronously', () => {
			const { view, onDocChange } = mount();

			typeText(view, 'ab');

			expect(onDocChange).toHaveBeenCalledTimes(2);
			expect(onDocChange).toHaveBeenLastCalledWith('ab');
		});

		it('switches between the light and dark base theme', () => {
			const { view } = mount();
			expect(view.state.facet(EditorView.darkTheme)).toBe(false);

			setComposerDark(view, true);

			expect(view.state.facet(EditorView.darkTheme)).toBe(true);
		});
	});

	describe('setComposerText', () => {
		it('replaces the text with the cursor at the end, without an undo step', () => {
			const { view, onDocChange } = mount('old');

			setComposerText(view, 'new text');

			expect(view.state.doc.toString()).toBe('new text');
			expect(view.state.selection.main.head).toBe(8);
			expect(undoDepth(view.state)).toBe(0);
			expect(onDocChange).toHaveBeenCalledWith('new text');
		});

		it('drops the undo history of the text it replaces', () => {
			const { view } = mount();
			typeText(view, 'buy milk');
			// Select all, then delete: the selection starts a new undo event.
			view.dispatch({ selection: { anchor: 0, head: view.state.doc.length }, userEvent: 'select' });
			view.dispatch({ changes: { from: 0, to: view.state.doc.length }, userEvent: 'delete' });
			typeText(view, 'call mom');

			setComposerText(view, '');

			expect(undoDepth(view.state)).toBe(0);
			press(view, 'z', { ctrlKey: true });
			expect(view.state.doc.toString()).toBe('');
		});

		it('still records typing after a replace', () => {
			const { view } = mount('old');
			setComposerText(view, '');

			typeText(view, 'idea');
			press(view, 'z', { ctrlKey: true });

			expect(view.state.doc.toString()).toBe('');
		});

		it('leaves the view alone when the text is already there', () => {
			const { view, onDocChange } = mount('same');
			view.dispatch({ selection: { anchor: 1 } });

			setComposerText(view, 'same');

			expect(view.state.selection.main.head).toBe(1);
			expect(onDocChange).not.toHaveBeenCalled();
		});

		it('handles an empty text', () => {
			const { view } = mount('old');

			setComposerText(view, '');

			expect(view.state.doc.toString()).toBe('');
		});
	});
});
