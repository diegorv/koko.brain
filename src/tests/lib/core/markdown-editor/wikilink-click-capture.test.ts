// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import {
	findWikilinkElement,
	resolveWikilinkClickPosition,
	WIKILINK_SELECTOR,
	type WikilinkClickView,
} from '#lib/core/markdown-editor/wikilink-click-target.js';
import { createMarkdownState } from './test-helpers';

describe('findWikilinkElement', () => {
	it('matches every wikilink class the editor uses', () => {
		const classes = [
			'cm-wikilink-target',
			'cm-wikilink-heading',
			'cm-wikilink-block-id',
			'cm-wikilink-display',
			'cm-wikilink-bracket',
			'cm-lp-wikilink',
		];
		for (const cls of classes) {
			const el = document.createElement('span');
			el.className = cls;
			expect(findWikilinkElement(el)).toBe(el);
		}
		// Sanity: keep WIKILINK_SELECTOR in sync with the asserted class list.
		for (const cls of classes) {
			expect(WIKILINK_SELECTOR).toContain(cls);
		}
	});

	it('walks up the DOM to find a wikilink ancestor', () => {
		const link = document.createElement('a');
		link.className = 'cm-lp-wikilink';
		const inner = document.createElement('span');
		link.appendChild(inner);
		expect(findWikilinkElement(inner)).toBe(link);
	});

	it('returns null for non-wikilink targets', () => {
		const el = document.createElement('span');
		el.className = 'cm-content cm-line';
		expect(findWikilinkElement(el)).toBeNull();
	});

	it('returns null for null / non-element targets', () => {
		expect(findWikilinkElement(null)).toBeNull();
		expect(findWikilinkElement({} as EventTarget)).toBeNull();
	});
});

describe('resolveWikilinkClickPosition', () => {
	// `see [[Note]] here`: the wikilink spans 4..12.
	const DOC = 'see [[Note]] here';
	const INSIDE_LINK = 7;
	const PLAIN_TEXT = 1;

	/**
	 * A real markdown EditorState with the geometry stubbed: jsdom has no
	 * layout, so `posAtCoords` / `posAtDOM` return the position the click
	 * would map to in the app.
	 */
	function viewAt(pos: number | null) {
		const stub = {
			state: createMarkdownState(DOC),
			posAtCoords: vi.fn(() => pos),
			posAtDOM: vi.fn(() => pos ?? 0),
		};
		return stub as typeof stub & WikilinkClickView;
	}

	/** A click on revealed source: the target is the line, no wikilink class. */
	function revealedClick(mods: { meta?: boolean; ctrl?: boolean; button?: number } = {}): MouseEvent {
		const line = document.createElement('div');
		line.className = 'cm-line';
		let captured: MouseEvent | null = null;
		line.addEventListener('mousedown', (e) => { captured = e; }, { once: true });
		line.dispatchEvent(new MouseEvent('mousedown', {
			bubbles: true,
			cancelable: true,
			button: mods.button ?? 0,
			metaKey: mods.meta ?? false,
			ctrlKey: mods.ctrl ?? false,
			clientX: 10,
			clientY: 20,
		}));
		return captured!;
	}

	function renderedClick(mods: { meta?: boolean; ctrl?: boolean; button?: number } = {}): MouseEvent {
		const link = document.createElement('a');
		link.className = 'cm-lp-wikilink';
		let captured: MouseEvent | null = null;
		link.addEventListener('mousedown', (e) => { captured = e; }, { once: true });
		link.dispatchEvent(new MouseEvent('mousedown', {
			bubbles: true,
			cancelable: true,
			button: mods.button ?? 0,
			metaKey: mods.meta ?? false,
			ctrlKey: mods.ctrl ?? false,
		}));
		return captured!;
	}

	describe('rendered wikilink', () => {
		it('macOS: plain click and Cmd+click open, Ctrl+click and right click do not', () => {
			expect(resolveWikilinkClickPosition(renderedClick(), viewAt(INSIDE_LINK), true)).toBe(INSIDE_LINK);
			expect(resolveWikilinkClickPosition(renderedClick({ meta: true }), viewAt(INSIDE_LINK), true)).toBe(INSIDE_LINK);
			expect(resolveWikilinkClickPosition(renderedClick({ ctrl: true }), viewAt(INSIDE_LINK), true)).toBeNull();
			expect(resolveWikilinkClickPosition(renderedClick({ ctrl: true, meta: true }), viewAt(INSIDE_LINK), true)).toBeNull();
			expect(resolveWikilinkClickPosition(renderedClick({ button: 2 }), viewAt(INSIDE_LINK), true)).toBeNull();
			expect(resolveWikilinkClickPosition(renderedClick({ button: 1 }), viewAt(INSIDE_LINK), true)).toBeNull();
		});

		it('Windows/Linux: plain click and Ctrl+click open, right click does not', () => {
			expect(resolveWikilinkClickPosition(renderedClick(), viewAt(INSIDE_LINK), false)).toBe(INSIDE_LINK);
			expect(resolveWikilinkClickPosition(renderedClick({ ctrl: true }), viewAt(INSIDE_LINK), false)).toBe(INSIDE_LINK);
			expect(resolveWikilinkClickPosition(renderedClick({ button: 2 }), viewAt(INSIDE_LINK), false)).toBeNull();
			expect(resolveWikilinkClickPosition(renderedClick({ ctrl: true, button: 2 }), viewAt(INSIDE_LINK), false)).toBeNull();
			expect(resolveWikilinkClickPosition(renderedClick({ button: 1 }), viewAt(INSIDE_LINK), false)).toBeNull();
		});
	});

	describe('revealed source (cursor on the wikilink line)', () => {
		it('macOS: Cmd+click opens the wikilink under the pointer', () => {
			const view = viewAt(INSIDE_LINK);
			expect(resolveWikilinkClickPosition(revealedClick({ meta: true }), view, true)).toBe(INSIDE_LINK);
			expect(view.posAtCoords).toHaveBeenCalledWith({ x: 10, y: 20 });
		});

		it('Windows/Linux: Ctrl+click opens the wikilink under the pointer', () => {
			expect(resolveWikilinkClickPosition(revealedClick({ ctrl: true }), viewAt(INSIDE_LINK), false)).toBe(INSIDE_LINK);
		});

		it('a plain click does not open (it places the cursor)', () => {
			expect(resolveWikilinkClickPosition(revealedClick(), viewAt(INSIDE_LINK), true)).toBeNull();
			expect(resolveWikilinkClickPosition(revealedClick(), viewAt(INSIDE_LINK), false)).toBeNull();
		});

		it('the other platform\'s modifier does not open', () => {
			expect(resolveWikilinkClickPosition(revealedClick({ ctrl: true }), viewAt(INSIDE_LINK), true)).toBeNull();
			expect(resolveWikilinkClickPosition(revealedClick({ meta: true }), viewAt(INSIDE_LINK), false)).toBeNull();
		});

		it('a right click with the modifier does not open', () => {
			expect(resolveWikilinkClickPosition(revealedClick({ meta: true, button: 2 }), viewAt(INSIDE_LINK), true)).toBeNull();
			expect(resolveWikilinkClickPosition(revealedClick({ ctrl: true, button: 2 }), viewAt(INSIDE_LINK), false)).toBeNull();
		});

		it('the modifier on plain text outside any wikilink returns null', () => {
			expect(resolveWikilinkClickPosition(revealedClick({ meta: true }), viewAt(PLAIN_TEXT), true)).toBeNull();
			expect(resolveWikilinkClickPosition(revealedClick({ ctrl: true }), viewAt(PLAIN_TEXT), false)).toBeNull();
		});

		it('returns null when the pointer maps to no document position', () => {
			expect(resolveWikilinkClickPosition(revealedClick({ meta: true }), viewAt(null), true)).toBeNull();
		});
	});
});

/**
 * Regression for the bug where clicking a wikilink could leave a multi-line
 * selection in the destination note (which the reveal rule then expanded
 * to raw markdown across several blocks).
 *
 * Root cause was that the wikilink mousedown handler ran on bubble phase, so
 * CodeMirror's internal handlers — registered on a descendant (`cm-content`)
 * — had already armed their drag-select state machine before our handler
 * could `stopPropagation`. The fix registers the listener with
 * `{ capture: true }` and uses `stopImmediatePropagation()`, so descendant
 * listeners never fire.
 *
 * This test pins the contract: with capture-phase + stopImmediatePropagation,
 * descendant mousedown listeners (simulating CodeMirror) are not invoked when
 * the target is a wikilink — but they ARE invoked for ordinary clicks.
 */
describe('wikilink mousedown capture-phase contract', () => {
	function buildDom() {
		const container = document.createElement('div');
		const cmEditor = document.createElement('div');
		cmEditor.className = 'cm-editor';
		const cmContent = document.createElement('div');
		cmContent.className = 'cm-content';
		const wikilink = document.createElement('a');
		wikilink.className = 'cm-lp-wikilink';
		wikilink.textContent = 'Year';
		const plain = document.createElement('span');
		plain.className = 'cm-line';
		plain.textContent = 'plain text';
		cmContent.appendChild(wikilink);
		cmContent.appendChild(plain);
		cmEditor.appendChild(cmContent);
		container.appendChild(cmEditor);
		document.body.appendChild(container);
		return { container, cmEditor, cmContent, wikilink, plain };
	}

	function attachWikilinkCaptureHandler(container: HTMLElement, calls: string[], mac = false) {
		// Mirrors MarkdownEditor.svelte: capture-phase listener that intercepts
		// only wikilink mousedowns and stops the event from reaching descendants.
		const view = {
			state: createMarkdownState('[[Year]] plain text'),
			posAtDOM: () => 2,
			posAtCoords: () => null,
		} as unknown as WikilinkClickView;
		const handler = (e: MouseEvent) => {
			if (resolveWikilinkClickPosition(e, view, mac) === null) return;
			calls.push('wikilink-handler');
			e.preventDefault();
			e.stopImmediatePropagation();
		};
		container.addEventListener('mousedown', handler, { capture: true });
		return () => container.removeEventListener('mousedown', handler, { capture: true });
	}

	function attachFakeCmHandlers(cmEditor: HTMLElement, cmContent: HTMLElement, calls: string[]) {
		// Simulates CodeMirror's internal selection handlers, which are
		// registered on `cm-editor` / `cm-content` (descendants of our
		// container). They run in capture and bubble phases respectively.
		const onCapture = () => calls.push('cm-capture');
		const onBubble = () => calls.push('cm-bubble');
		cmEditor.addEventListener('mousedown', onCapture, { capture: true });
		cmContent.addEventListener('mousedown', onBubble);
		return () => {
			cmEditor.removeEventListener('mousedown', onCapture, { capture: true });
			cmContent.removeEventListener('mousedown', onBubble);
		};
	}

	it('clicking a wikilink does NOT reach descendant CodeMirror listeners', () => {
		const { container, cmEditor, cmContent, wikilink } = buildDom();
		const calls: string[] = [];
		const detachWl = attachWikilinkCaptureHandler(container, calls);
		const detachCm = attachFakeCmHandlers(cmEditor, cmContent, calls);

		wikilink.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));

		expect(calls).toEqual(['wikilink-handler']);
		detachWl();
		detachCm();
		container.remove();
	});

	it('clicking inside a wikilink (nested span) still intercepts before CodeMirror', () => {
		const { container, cmEditor, cmContent, wikilink } = buildDom();
		const inner = document.createElement('span');
		wikilink.appendChild(inner);
		const calls: string[] = [];
		const detachWl = attachWikilinkCaptureHandler(container, calls);
		const detachCm = attachFakeCmHandlers(cmEditor, cmContent, calls);

		inner.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));

		expect(calls).toEqual(['wikilink-handler']);
		detachWl();
		detachCm();
		container.remove();
	});

	it('right-clicking a wikilink does not navigate and still reaches CodeMirror', () => {
		const { container, cmEditor, cmContent, wikilink } = buildDom();
		const calls: string[] = [];
		const detachWl = attachWikilinkCaptureHandler(container, calls);
		const detachCm = attachFakeCmHandlers(cmEditor, cmContent, calls);

		const ev = new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 2 });
		wikilink.dispatchEvent(ev);

		expect(calls).toEqual(['cm-capture', 'cm-bubble']);
		expect(ev.defaultPrevented).toBe(false);
		detachWl();
		detachCm();
		container.remove();
	});

	it('macOS Ctrl+clicking a wikilink does not navigate and still reaches CodeMirror', () => {
		const { container, cmEditor, cmContent, wikilink } = buildDom();
		const calls: string[] = [];
		const detachWl = attachWikilinkCaptureHandler(container, calls, true);
		const detachCm = attachFakeCmHandlers(cmEditor, cmContent, calls);

		const ev = new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 0, ctrlKey: true });
		wikilink.dispatchEvent(ev);

		expect(calls).toEqual(['cm-capture', 'cm-bubble']);
		expect(ev.defaultPrevented).toBe(false);
		detachWl();
		detachCm();
		container.remove();
	});

	it('clicking ordinary text DOES reach CodeMirror listeners (no interception)', () => {
		const { container, cmEditor, cmContent, plain } = buildDom();
		const calls: string[] = [];
		const detachWl = attachWikilinkCaptureHandler(container, calls);
		const detachCm = attachFakeCmHandlers(cmEditor, cmContent, calls);

		plain.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));

		expect(calls).toEqual(['cm-capture', 'cm-bubble']);
		detachWl();
		detachCm();
		container.remove();
	});

	it('preventDefault on wikilink mousedown is honored (cancelable event)', () => {
		const { container, wikilink } = buildDom();
		const calls: string[] = [];
		const detachWl = attachWikilinkCaptureHandler(container, calls);

		const ev = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
		wikilink.dispatchEvent(ev);

		expect(ev.defaultPrevented).toBe(true);
		detachWl();
		container.remove();
	});
});
