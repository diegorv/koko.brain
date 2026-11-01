// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { focusReturnTarget, type FocusReturnInput } from '#lib/features/event-calendar/event-calendar-focus.logic.js';

const PATH = '/vault/Events/Standup.md';

let root: HTMLElement;
let block: HTMLElement;
let otherPane: HTMLElement;

/** Builds a calendar root (a `tabindex="-1"` wrapper) holding a block, and a pane next to it. */
beforeEach(() => {
	document.body.innerHTML = '';
	root = document.body.appendChild(document.createElement('div'));
	root.setAttribute('tabindex', '-1');
	block = root.appendChild(document.createElement('div'));
	block.dataset.eventPath = PATH;
	block.setAttribute('tabindex', '0');
	otherPane = document.body.appendChild(document.createElement('div'));
});

function input(overrides: Partial<FocusReturnInput> = {}): FocusReturnInput {
	return {
		outside: null,
		root,
		handOffFocus: false,
		focusCopy: false,
		lastPath: PATH,
		activeElement: document.body,
		findBlock: (path) => root.querySelector<HTMLElement>(`[data-event-path="${CSS.escape(path)}"]`),
		...overrides,
	};
}

function el(parent: HTMLElement, tag: string, attrs: Record<string, string> = {}): HTMLElement {
	const node = parent.appendChild(document.createElement(tag));
	for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
	return node;
}

describe('focusReturnTarget: the outside click target', () => {
	it.each([
		['a native control outside the view', () => el(otherPane, 'button'), (t: HTMLElement) => t],
		['a native control inside the view', () => el(root, 'input'), (t: HTMLElement) => t],
		['a roving tabindex="-1" tab inside the view', () => el(el(root, 'div', { role: 'tablist', tabindex: '-1' }), 'button', { role: 'tab', tabindex: '-1' }), (t: HTMLElement) => t],
		['a tabindex="-1" surface in another pane', () => el(otherPane, 'div', { tabindex: '-1' }), (t: HTMLElement) => t],
		['a tabindex="-1" wrapper inside the view', () => el(root, 'div', { role: 'tablist', tabindex: '-1' }), () => block],
		['empty space in the view (the root itself)', () => root, () => block],
		['a non-focusable element outside', () => el(otherPane, 'span'), () => block],
	])('%s', (_label, make, expected) => {
		const clicked = make();

		expect(focusReturnTarget(input({ outside: clicked }))).toBe(expected(clicked));
	});

	it('uses the focusable ancestor of the clicked element', () => {
		const button = el(otherPane, 'button');
		const icon = el(button, 'span');

		expect(focusReturnTarget(input({ outside: icon }))).toBe(button);
	});

	it('ignores a clicked element that has unmounted', () => {
		const gone = el(otherPane, 'button');
		gone.remove();

		expect(focusReturnTarget(input({ outside: gone }))).toBe(block);
	});
});

describe('focusReturnTarget: no outside target', () => {
	it('returns focus to the last shown event\'s block', () => {
		expect(focusReturnTarget(input())).toBe(block);
	});

	it('falls back to the root when the block is gone or no event was shown', () => {
		block.remove();
		expect(focusReturnTarget(input())).toBe(root);
		expect(focusReturnTarget(input({ lastPath: null }))).toBe(root);
	});

	it('returns nothing when the root is missing or disconnected', () => {
		expect(focusReturnTarget(input({ root: undefined }))).toBeNull();
		root.remove();
		expect(focusReturnTarget(input())).toBeNull();
	});
});

describe('focusReturnTarget: hand-offs', () => {
	it('leaves focus alone when Edit hands it to the dialog, whatever was clicked', () => {
		expect(focusReturnTarget(input({ handOffFocus: true, outside: el(otherPane, 'button') }))).toBeNull();
		expect(focusReturnTarget(input({ handOffFocus: true, focusCopy: true }))).toBeNull();
	});

	it('parks focus on the root for Duplicate when focus is outside it', () => {
		expect(focusReturnTarget(input({ focusCopy: true, outside: el(otherPane, 'button') }))).toBe(root);
	});

	it('leaves focus alone for Duplicate when it is already inside the root', () => {
		expect(focusReturnTarget(input({ focusCopy: true, activeElement: block }))).toBeNull();
	});

	it('leaves focus alone for Duplicate when the root is disconnected', () => {
		root.remove();
		expect(focusReturnTarget(input({ focusCopy: true }))).toBeNull();
	});
});
