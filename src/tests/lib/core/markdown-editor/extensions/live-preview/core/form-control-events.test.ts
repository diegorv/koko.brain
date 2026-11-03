// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { isFormControlInputEvent } from '#lib/core/markdown-editor/extensions/live-preview/core/form-control-events.js';

function fire(target: Element, event: Event): Event {
	target.dispatchEvent(event);
	return event;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K): HTMLElementTagNameMap[K] {
	return document.body.appendChild(document.createElement(tag));
}

afterEach(() => {
	document.body.replaceChildren();
});

describe('isFormControlInputEvent', () => {
	const keyAndInputEvents = (): Event[] => [
		new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true }),
		new KeyboardEvent('keyup', { key: 'Backspace', bubbles: true }),
		new KeyboardEvent('keypress', { key: 'a', bubbles: true }),
		new InputEvent('beforeinput', { bubbles: true }),
		new InputEvent('input', { bubbles: true }),
		new CompositionEvent('compositionstart', { bubbles: true }),
		new CompositionEvent('compositionupdate', { bubbles: true }),
		new CompositionEvent('compositionend', { bubbles: true }),
	];

	for (const tag of ['input', 'select', 'textarea'] as const) {
		it(`claims key, input and composition events from a <${tag}>`, () => {
			const control = el(tag);
			for (const ev of keyAndInputEvents()) {
				expect(isFormControlInputEvent(fire(control, ev)), ev.type).toBe(true);
			}
		});
	}

	it('claims a key event whose target sits inside a control', () => {
		const select = el('select');
		const option = select.appendChild(document.createElement('option'));
		expect(isFormControlInputEvent(fire(option, new KeyboardEvent('keydown', { bubbles: true })))).toBe(true);
	});

	it('leaves mouse events from a control to CodeMirror', () => {
		const input = el('input');
		for (const type of ['mousedown', 'mouseup', 'click']) {
			expect(isFormControlInputEvent(fire(input, new MouseEvent(type, { bubbles: true }))), type).toBe(false);
		}
	});

	it('leaves key events from a non-control element to CodeMirror', () => {
		const label = el('label');
		expect(isFormControlInputEvent(fire(label, new KeyboardEvent('keydown', { bubbles: true })))).toBe(false);
	});

	it('returns false for an event that was never dispatched (no target)', () => {
		expect(isFormControlInputEvent(new KeyboardEvent('keydown'))).toBe(false);
	});
});
