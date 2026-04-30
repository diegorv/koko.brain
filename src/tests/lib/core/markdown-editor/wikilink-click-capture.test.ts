// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { findWikilinkElement, WIKILINK_SELECTOR } from '$lib/core/markdown-editor/wikilink-click-target';

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

/**
 * Regression for the bug where clicking a wikilink could leave a multi-line
 * selection in the destination note (which `shouldShowSource` then expanded
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

	function attachWikilinkCaptureHandler(container: HTMLElement, calls: string[]) {
		// Mirrors MarkdownEditor.svelte: capture-phase listener that intercepts
		// only wikilink mousedowns and stops the event from reaching descendants.
		const handler = (e: MouseEvent) => {
			const el = findWikilinkElement(e.target);
			if (!el) return;
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
