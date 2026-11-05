// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('svelte-sonner', () => ({
	toast: { error: vi.fn(), success: vi.fn() },
}));

// The system clipboard is a side-effect boundary.
const writeText = vi.fn((_text: string) => Promise.resolve());
Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
// Menu Paste reads through the Tauri clipboard plugin, a Tauri boundary.
vi.mock('@tauri-apps/plugin-clipboard-manager', () => ({
	readText: vi.fn(() => Promise.resolve('')),
}));
// jsdom has no scrolling; the editor restores a remounted tab's scroll position.
Element.prototype.scrollTo = () => {};
// WebKit honors `focus({ preventScroll })`. jsdom ignores the option, so
// CodeMirror would fall back to restoring every ancestor's scroll after a
// focus, undoing its own focus-observer scroll write that the tab-switch tests
// reproduce. Reading the option is how CodeMirror detects the support.
const jsdomFocus = HTMLElement.prototype.focus;
HTMLElement.prototype.focus = function (options?: FocusOptions) {
	void options?.preventScroll;
	jsdomFocus.call(this, options);
};
// The session log file is a side-effect boundary; `debug()` itself runs for real.
vi.mock('#lib/utils/log.service.js', async (importOriginal) => ({
	...(await importOriginal<typeof import('#lib/utils/log.service.js')>()),
	appendLog: vi.fn(),
}));

import { mount, unmount, flushSync } from 'svelte';
import MarkdownEditor from '#lib/core/markdown-editor/MarkdownEditor.svelte';
import type { EditorView } from '@codemirror/view';
import { readText } from '@tauri-apps/plugin-clipboard-manager';
import { toast } from 'svelte-sonner';
import { NOOP_HOST, type EditorHost } from '#lib/core/markdown-editor/editor-host.js';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { isTabDirty } from '#lib/core/editor/editor.logic.js';
import { resetEditor, syncExternalContentToEditor } from '#lib/core/editor/editor.service.js';
import { collectionStore } from '#lib/features/collection/collection.store.svelte.js';
import type { PropertyIndexRecord } from '#lib/features/collection/collection.types.js';
import { appBlockLinks, appFencedBlockRenderers } from '#lib/app/editor-host.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { appendLog } from '#lib/utils/log.service.js';
import { formatShortcut } from '#lib/utils/keybindings.js';
import { COPY_BLOCK_LINK_SHORTCUT } from '#lib/core/markdown-editor/setup/editor-extensions.js';

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

function render(content: string, host: EditorHost = NOOP_HOST) {
	editorStore.addTab({ path: PATH, name: 'Note.md', content, savedContent: content });
	target = document.body.appendChild(document.createElement('div'));
	component = mount(MarkdownEditor, { target, props: { host, renderers: appFencedBlockRenderers, blockLinks: appBlockLinks } });
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

/** An item's label without its shortcut hint, so "Copy" does not match "Copy link to block". */
function itemLabel(el: Element): string {
	const clone = el.cloneNode(true) as Element;
	clone.querySelector('[data-slot="context-menu-shortcut"]')?.remove();
	return clone.textContent?.trim() ?? '';
}

/** Right-clicks the editor surface and returns the open menu's item named `label`. */
async function openMenuItem(label: string): Promise<HTMLElement> {
	const surface = target.querySelector('.absolute.inset-0')!;
	surface.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 1, clientY: 1 }));
	flushSync();
	await settle();
	const item = [...document.body.querySelectorAll('[data-slot="context-menu-item"]')].find(
		(el) => itemLabel(el) === label,
	) as HTMLElement | undefined;
	if (!item) throw new Error(`No context-menu item "${label}"`);
	return item;
}

/** Right-clicks the editor surface and clicks the context-menu item named `label`. */
async function clickMenuItem(label: string): Promise<void> {
	const item = await openMenuItem(label);
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
		/**
		 * Selects `anchor..head` and makes the next right-click land at `pos`.
		 * jsdom has no layout, so `posAtCoords` is stubbed on the view instance.
		 */
		function selectAndAim(anchor: number, head: number, pos: number): EditorView {
			const view = editorStore.editorView!;
			view.dispatch({ selection: { anchor, head } });
			view.posAtCoords = (() => pos) as EditorView['posAtCoords'];
			return view;
		}

		it('lists Cut, Copy, Paste, Select all, a separator, then the block-link items', async () => {
			render('First paragraph\n');

			const item = await openMenuItem('Cut');
			const content = item.parentElement!;
			const entries = [...content.children].map((el) =>
				el.getAttribute('data-slot') === 'context-menu-separator' ? '---' : itemLabel(el),
			);

			expect(entries).toEqual(['Cut', 'Copy', 'Paste', 'Select all', '---', 'Copy link to block', 'Copy block embed']);
		});

		it('shows the block-link keymap combo as its hint, written by formatShortcut', async () => {
			render('First paragraph\n');

			const item = await openMenuItem('Copy link to block');
			const hint = item.querySelector('[data-slot="context-menu-shortcut"]')?.textContent;

			expect(hint).toBe(formatShortcut(COPY_BLOCK_LINK_SHORTCUT));
			expect(hint).toBe('⌘⇧L');
		});

		describe('clipboard items', () => {
			const DOC = 'First paragraph\n';

			it('Copy writes the selected text and leaves the doc unchanged', async () => {
				render(DOC);
				const view = selectAndAim(0, 5, 2);

				await clickMenuItem('Copy');

				expect(writeText).toHaveBeenCalledWith('First');
				expect(view.state.doc.toString()).toBe(DOC);
			});

			it('Cut writes the selected text and removes it', async () => {
				render(DOC);
				const view = selectAndAim(0, 5, 2);

				await clickMenuItem('Cut');

				expect(writeText).toHaveBeenCalledWith('First');
				expect(view.state.doc.toString()).toBe(' paragraph\n');
			});

			it('Cut deletes nothing when the selection moves while the clipboard write is pending', async () => {
				render(DOC);
				const view = selectAndAim(0, 5, 2);
				let finishWrite!: () => void;
				writeText.mockImplementationOnce(() => new Promise<void>((resolve) => (finishWrite = resolve)));

				await clickMenuItem('Cut');
				view.dispatch({ selection: { anchor: 6, head: 15 } });
				finishWrite();
				await settle();

				expect(writeText).toHaveBeenCalledWith('First');
				expect(view.state.doc.toString()).toBe(DOC);
			});

			it('Cut leaves the doc unchanged and shows the copy toast when the write fails', async () => {
				render(DOC);
				const view = selectAndAim(0, 5, 2);
				const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
				writeText.mockRejectedValueOnce(new Error('denied'));

				await clickMenuItem('Cut');

				expect(view.state.doc.toString()).toBe(DOC);
				expect(toast.error).toHaveBeenCalledWith('Could not copy to the clipboard.');
				consoleError.mockRestore();
			});

			it('Paste replaces the selection with the clipboard text', async () => {
				render(DOC);
				const view = selectAndAim(0, 5, 2);
				vi.mocked(readText).mockResolvedValueOnce('abc');

				await clickMenuItem('Paste');

				expect(view.state.doc.toString()).toBe('abc paragraph\n');
			});

			it('Paste inserts at the cursor when nothing is selected', async () => {
				render(DOC);
				const view = selectAndAim(5, 5, 5);
				vi.mocked(readText).mockResolvedValueOnce('abc');

				await clickMenuItem('Paste');

				expect(view.state.doc.toString()).toBe('Firstabc paragraph\n');
			});

			it('Paste leaves the doc unchanged and shows the paste toast when the read fails', async () => {
				render(DOC);
				const view = selectAndAim(0, 5, 2);
				const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
				vi.mocked(readText).mockRejectedValueOnce(new Error('denied'));

				await clickMenuItem('Paste');

				expect(view.state.doc.toString()).toBe(DOC);
				expect(toast.error).toHaveBeenCalledWith('Could not paste from the clipboard.');
				consoleError.mockRestore();
			});

			it('Paste with an empty clipboard keeps the selection text', async () => {
				render(DOC);
				const view = selectAndAim(0, 5, 2);
				vi.mocked(readText).mockResolvedValueOnce('');

				await clickMenuItem('Paste');

				expect(view.state.doc.toString()).toBe(DOC);
			});

			it('Select all selects the whole doc', async () => {
				render(DOC);
				const view = selectAndAim(3, 3, 3);

				await clickMenuItem('Select all');

				expect(view.state.selection.main.from).toBe(0);
				expect(view.state.selection.main.to).toBe(DOC.length);
			});

			it.each(['Cut', 'Copy'])('%s is disabled with an empty selection and clicking it changes nothing', async (label) => {
				render(DOC);
				const view = selectAndAim(3, 3, 3);

				const item = await openMenuItem(label);
				expect(item.hasAttribute('data-disabled')).toBe(true);
				item.click();
				await settle();

				expect(writeText).not.toHaveBeenCalled();
				expect(view.state.doc.toString()).toBe(DOC);
			});
		});

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

		describe('right-click with a selection', () => {
			const DOC = 'First paragraph\nSecond line\n';
			/** Offset 18: inside "Second line", on line 2. */
			const LINE_2_POS = 18;

			function rightClick(): void {
				const surface = target.querySelector('.absolute.inset-0')!;
				surface.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 1, clientY: 1 }));
				flushSync();
			}

			it('inside the selection keeps it', () => {
				render(DOC);
				const view = selectAndAim(0, 5, 2);

				rightClick();

				expect(view.state.selection.main.anchor).toBe(0);
				expect(view.state.selection.main.head).toBe(5);
			});

			it('outside the selection collapses it to a cursor at the click', () => {
				render(DOC);
				const view = selectAndAim(0, 5, LINE_2_POS);

				rightClick();

				expect(view.state.selection.main.empty).toBe(true);
				expect(view.state.selection.main.head).toBe(LINE_2_POS);
			});

			it('Copy link to block acts on the clicked line, not the selection head', async () => {
				render(DOC);
				const view = selectAndAim(2, 20, 4);

				await clickMenuItem('Copy link to block');

				expect(writeText).toHaveBeenCalledTimes(1);
				const link = writeText.mock.calls[0][0];
				expect(link).toMatch(/^\[\[Note#\^[\w-]+\]\]$/);
				const id = link.slice('[[Note#^'.length, -2);
				expect(view.state.doc.toString()).toBe(`First paragraph ^${id}\nSecond line\n`);
			});
		});
	});

	describe('a widget that throws while a whole-doc replace renders it', () => {
		/**
		 * A host whose asset URL throws on its first call, so the first `file://`
		 * image widget rendered throws from `toDOM` during the doc-replace dispatch.
		 * Later calls succeed, so the view can be rebuilt with the same note.
		 */
		let assetUrlCalls = 0;
		const throwingHost: EditorHost = {
			...NOOP_HOST,
			assetUrl: (path) => {
				assetUrlCalls++;
				if (assetUrlCalls === 1) throw new Error('assetUrl exploded');
				return `asset://localhost/${encodeURIComponent(path)}`;
			},
		};
		const IMAGE_DOC = 'intro\n\n![shot](file:///Users/me/pic.png)\n\ntext\n';
		const IMAGE_PATH = '/vault/Image.md';
		let consoleError: ReturnType<typeof vi.spyOn>;

		beforeEach(() => {
			assetUrlCalls = 0;
			consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
		});

		afterEach(() => {
			// Typing armed the debounced auto-save; cancel it so it does not fire after the test.
			resetEditor();
			consoleError.mockRestore();
		});

		function view(): EditorView {
			return editorStore.editorView!;
		}

		/** Types `text` at the end of the doc, the way a keystroke reaches CodeMirror. */
		function type(text: string): void {
			view().dispatch({ changes: { from: view().state.doc.length, insert: text }, userEvent: 'input.type' });
			flushSync();
		}

		function openTab(path: string, content: string): void {
			editorStore.addTab({ path, name: path.split('/').pop()!, content, savedContent: content });
			flushSync();
		}

		function loggedTypeErrors(): unknown[] {
			return consoleError.mock.calls.flat().filter((arg: unknown) => arg instanceof TypeError);
		}

		/** Whether `replaceDoc` logged that its dispatch threw and it rebuilt the view. */
		function loggedDocReplaceThrow(): boolean {
			return consoleError.mock.calls.some((call: unknown[]) =>
				call.includes('doc replace threw, rebuilding the view:'),
			);
		}

		it('typing after a throwing tab switch still reaches the store and marks the tab dirty', () => {
			render('first note', throwingHost);

			expect(() => openTab(IMAGE_PATH, IMAGE_DOC)).not.toThrow();
			expect(assetUrlCalls).toBeGreaterThan(1);
			expect(loggedDocReplaceThrow()).toBe(true);
			type('!');

			expect(editorStore.activeTab!.path).toBe(IMAGE_PATH);
			expect(editorStore.activeTab!.content).toBe(`${IMAGE_DOC}!`);
			expect(isTabDirty(editorStore.activeTab!)).toBe(true);
		});

		it('typing after a throwing external-content sync still reaches the store', () => {
			render('first note', throwingHost);

			expect(() => {
				syncExternalContentToEditor(PATH, IMAGE_DOC, true, 'none');
				flushSync();
			}).not.toThrow();
			expect(assetUrlCalls).toBeGreaterThan(1);
			expect(loggedDocReplaceThrow()).toBe(true);
			type('!');

			expect(editorStore.activeTab!.content).toBe(`${IMAGE_DOC}!`);
			expect(isTabDirty(editorStore.activeTab!)).toBe(true);
		});

		it('a second tab switch after the throw shows the right note and edits land only in that tab', () => {
			render('first note', throwingHost);
			openTab(IMAGE_PATH, IMAGE_DOC);
			expect(assetUrlCalls).toBeGreaterThan(1);
			expect(loggedDocReplaceThrow()).toBe(true);

			expect(() => openTab('/vault/Third.md', 'third note body')).not.toThrow();

			expect(view().state.doc.toString()).toBe('third note body');
			expect(view().contentDOM.textContent).toBe('third note body');
			type('!');
			expect(editorStore.activeTab!.content).toBe('third note body!');
			const byPath = (p: string) => editorStore.tabs.find((t) => t.path === p)!;
			expect(byPath(PATH).content).toBe('first note');
			expect(byPath(IMAGE_PATH).content).toBe(IMAGE_DOC);
			expect(loggedTypeErrors()).toEqual([]);
		});
	});

	describe('tab-switch scroll log', () => {
		const FRESH_PATH = '/vault/Fresh.md';
		const SECRET = 'secret note body';
		/** Frames queued by `requestAnimationFrame`, run one frame at a time by `nextFrame`. */
		let frames: FrameRequestCallback[] = [];

		beforeEach(() => {
			frames = [];
			vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => frames.push(cb));
		});

		afterEach(() => {
			vi.unstubAllGlobals();
			settingsStore.reset();
		});

		/** Runs the callbacks queued for the next frame (not the ones they queue). */
		function nextFrame(): void {
			const due = frames;
			frames = [];
			for (const cb of due) cb(0);
		}

		function openTab(path: string, content: string): void {
			editorStore.addTab({ path, name: path.split('/').pop()!, content, savedContent: content });
			flushSync();
		}

		/** The TAB_SWITCH lines written to the log file, joined into one string each. */
		function tabSwitchLines(): string[] {
			return vi
				.mocked(appendLog)
				.mock.calls.filter(([tag]) => tag === 'FRONT-END:TAB_SWITCH')
				.map(([, ...args]) => args.join(' '));
		}

		function scrollLines(): string[] {
			return tabSwitchLines().filter((line) => line.startsWith('scroll '));
		}

		it('logs scrollTop and viewport at every step of a switch to a fresh tab', () => {
			settingsStore.updateDebugLogToFile(true);
			render('first note');
			openTab(FRESH_PATH, `${SECRET}\n\nmore ${SECRET}\n`);
			nextFrame();
			nextFrame();
			nextFrame();

			const steps = scrollLines().map((line) => line.split(',')[0]);
			expect(steps).toEqual([
				'scroll saved view state: none (fresh tab)',
				'scroll before replace',
				'scroll after replace',
				'scroll after focus',
				'scroll frame 1',
				'scroll after restore',
				'scroll frame 2',
				'scroll frame 3',
			]);
			for (const line of scrollLines().slice(1)) {
				expect(line).toMatch(/^scroll [a-z0-9 ]+, path: \/vault\/Fresh\.md scrollTop: \d+ viewport: \d+-\d+$/);
			}
			expect(tabSwitchLines().join('\n')).not.toContain(SECRET);
		});

		it('logs the saved view state used when returning to a tab', () => {
			settingsStore.updateDebugLogToFile(true);
			render('first note');
			openTab(FRESH_PATH, 'fresh');
			editorStore.setActiveIndex(0);
			flushSync();

			expect(scrollLines()).toContain(
				`scroll saved view state: scrollTop=0 scrollLeft=0 cursorPos=0, path: ${PATH}`,
			);
		});

		it('logs scroll events on the editor until the third frame', () => {
			settingsStore.updateDebugLogToFile(true);
			render('first note');
			openTab(FRESH_PATH, 'fresh');
			const scroller = editorStore.editorView!.scrollDOM;
			scroller.dispatchEvent(new Event('scroll'));
			nextFrame();
			nextFrame();
			nextFrame();
			scroller.dispatchEvent(new Event('scroll'));

			const events = scrollLines().filter((line) => line.startsWith('scroll event'));
			expect(events).toEqual([`scroll event, path: ${FRESH_PATH} scrollTop: 0 viewport: 0-5`]);
		});

		/**
		 * Gives the editor's scroller a real scroll position (jsdom has none),
		 * scrolls the current tab to `scrollTop` so CodeMirror records it, and
		 * moves focus out of the editor, as a sidebar click does. A doc replace
		 * resets the position to 0, as the browser does when the content swaps.
		 * Returns the element now holding focus.
		 */
		function scrollCurrentTabAndBlur(scrollTop: number): HTMLElement {
			const view = editorStore.editorView!;
			const scroller = view.scrollDOM;
			let top = 0;
			let left = 0;
			Object.defineProperty(scroller, 'scrollTop', { configurable: true, get: () => top, set: (v: number) => (top = v) });
			Object.defineProperty(scroller, 'scrollLeft', { configurable: true, get: () => left, set: (v: number) => (left = v) });
			scroller.scrollTo = ((x: number, y: number) => {
				left = x;
				top = y;
			}) as typeof scroller.scrollTo;
			const setState = view.setState.bind(view);
			view.setState = (state) => {
				setState(state);
				top = 0;
				left = 0;
			};
			view.focus();
			top = scrollTop;
			scroller.dispatchEvent(new Event('scroll'));
			const outside = document.body.appendChild(document.createElement('button'));
			outside.focus();
			return outside;
		}

		/** The `scrollTop` the log reports at `step` of the switch to `path`. */
		function loggedScrollTop(step: string, path: string): number | undefined {
			const line = scrollLines().find((l) => l.startsWith(`scroll ${step}, path: ${path} `));
			const match = line?.match(/scrollTop: (\d+)/);
			return match ? Number(match[1]) : undefined;
		}

		it('opens a fresh tab at the top, never at the previous tab scroll', () => {
			settingsStore.updateDebugLogToFile(true);
			render('first note');
			scrollCurrentTabAndBlur(192);
			openTab(FRESH_PATH, 'fresh');
			nextFrame();
			nextFrame();
			nextFrame();

			expect(loggedScrollTop('after focus', FRESH_PATH)).toBe(0);
			expect(loggedScrollTop('frame 1', FRESH_PATH)).toBe(0);
			expect(loggedScrollTop('after restore', FRESH_PATH)).toBe(0);
			expect(editorStore.editorView!.scrollDOM.scrollTop).toBe(0);
		});

		it('returns to a saved tab at its saved scroll, never at the previous tab scroll', () => {
			settingsStore.updateDebugLogToFile(true);
			render('first note');
			const outside = scrollCurrentTabAndBlur(300);
			openTab(FRESH_PATH, 'fresh');
			nextFrame();
			nextFrame();
			nextFrame();
			const scroller = editorStore.editorView!.scrollDOM;
			scroller.scrollTop = 192;
			scroller.dispatchEvent(new Event('scroll'));
			outside.focus();
			editorStore.setActiveIndex(0);
			flushSync();
			nextFrame();
			nextFrame();
			nextFrame();

			expect(loggedScrollTop('after focus', PATH)).toBe(300);
			expect(loggedScrollTop('frame 1', PATH)).toBe(300);
			expect(scroller.scrollTop).toBe(300);
		});

		it('logs the pending scrollIntoView before and at its dispatch', () => {
			settingsStore.updateDebugLogToFile(true);
			render('first note');
			openTab(FRESH_PATH, 'fresh note');
			editorStore.setPendingScrollPosition(3);
			flushSync();
			nextFrame();
			nextFrame();
			nextFrame();

			const steps = scrollLines().map((line) => line.split(',')[0]);
			expect(steps).toContain('scroll pending scrollIntoView pos=3 before');
			expect(steps).toContain('scroll pending scrollIntoView pos=3 dispatched');
		});

		/**
		 * Switches from the first note to a fresh tab and runs three frames,
		 * counting the `scrollTop` reads and scroll-listener registrations on
		 * the editor's scroller from the switch on.
		 */
		function countSwitchLayoutAccess(logOn: boolean): { reads: number; scrollListeners: number; logged: number } {
			settingsStore.updateDebugLogToFile(logOn);
			render('first note');
			const scroller = editorStore.editorView!.scrollDOM;
			let reads = 0;
			Object.defineProperty(scroller, 'scrollTop', {
				configurable: true,
				get: () => {
					reads++;
					return 0;
				},
				set: () => {},
			});
			const addListener = vi.spyOn(scroller, 'addEventListener');
			openTab(FRESH_PATH, 'fresh');
			nextFrame();
			nextFrame();
			nextFrame();
			const scrollListeners = addListener.mock.calls.filter(([type]) => type === 'scroll').length;
			const logged = scrollLines().filter((line) => line.includes(' scrollTop: ')).length;
			if (component) unmount(component);
			component = null;
			target.remove();
			editorStore.reset();
			settingsStore.reset();
			vi.mocked(appendLog).mockClear();
			flushSync();
			return { reads, scrollListeners, logged };
		}

		it('reads no layout for the log with the debug log off', () => {
			const on = countSwitchLayoutAccess(true);
			const off = countSwitchLayoutAccess(false);

			expect(on.logged).toBeGreaterThan(0);
			expect(on.scrollListeners).toBe(1);
			expect(off.scrollListeners).toBe(0);
			// The only reads left with the log off are the editor's own (saving the
			// previous tab's view state, CodeMirror's measure): one fewer per line.
			expect(off.reads).toBe(on.reads - on.logged);
		});

		it('writes no scroll line with the debug log off', () => {
			const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
			render('first note');
			openTab(FRESH_PATH, 'fresh');
			editorStore.editorView!.scrollDOM.dispatchEvent(new Event('scroll'));
			nextFrame();
			nextFrame();
			nextFrame();

			expect(scrollLines()).toEqual([]);
			expect(consoleLog).not.toHaveBeenCalled();
			consoleLog.mockRestore();
		});
	});
});
