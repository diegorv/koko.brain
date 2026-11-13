import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StateEffect } from '@codemirror/state';

// No mocks for stores, logic, or the link parser — use real implementations per CLAUDE.md.

import { editorHost, NOOP_HOST } from '#lib/core/markdown-editor/editor-host.js';
import {
	handleLivePreviewLinkMousedown,
	handleLivePreviewTagMousedown,
} from '#lib/core/markdown-editor/extensions/live-preview/click-handler.js';
import { createMarkdownState } from '../../test-helpers';

/** Where the editor host opens external URLs. */
const mockOpenUrl = vi.fn();
/** Where the editor host opens the tag search. */
const mockOpenTagSearch = vi.fn();
const host = {
	...NOOP_HOST,
	openExternal: (url: string) => mockOpenUrl(url),
	openTagSearch: (tag: string) => mockOpenTagSearch(tag),
};

/** Builds a fake mouse event whose target.closest resolves to the given link element. */
function createEvent(opts: {
	meta?: boolean;
	ctrl?: boolean;
	alt?: boolean;
	shift?: boolean;
	button?: number;
	linkEl?: HTMLElement | null;
}): MouseEvent {
	const target = { closest: vi.fn(() => opts.linkEl ?? null) };
	return {
		button: opts.button ?? 0,
		metaKey: opts.meta ?? false,
		ctrlKey: opts.ctrl ?? false,
		altKey: opts.alt ?? false,
		shiftKey: opts.shift ?? false,
		target,
		preventDefault: vi.fn(),
	} as unknown as MouseEvent;
}

/** Builds a fake view backed by a real markdown EditorState (so syntaxTree works). */
function createView(doc: string, posAtDOM = 0): any {
	return {
		posAtDOM: vi.fn(() => posAtDOM),
		state: createMarkdownState(doc).update({ effects: StateEffect.appendConfig.of(editorHost.of(host)) }).state,
	};
}

/** Minimal link element stub exposing only textContent + closest-target identity. */
function linkWithText(text: string): HTMLElement {
	return { textContent: text } as unknown as HTMLElement;
}

describe('handleLivePreviewLinkMousedown', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockOpenUrl.mockResolvedValue(undefined);
	});

	it('returns false without the open modifier', () => {
		const handled = handleLivePreviewLinkMousedown(createEvent({}), createView('plain text'), true);
		expect(handled).toBe(false);
		expect(mockOpenUrl).not.toHaveBeenCalled();
	});

	it('returns false when there is no .cm-lp-link under the cursor', () => {
		const handled = handleLivePreviewLinkMousedown(
			createEvent({ meta: true, linkEl: null }),
			createView('plain text'),
			true,
		);
		expect(handled).toBe(false);
		expect(mockOpenUrl).not.toHaveBeenCalled();
	});

	it('opens a safe bare URL from the link text and returns true', () => {
		const handled = handleLivePreviewLinkMousedown(
			createEvent({ meta: true, linkEl: linkWithText('https://example.com') }),
			createView('https://example.com'),
			true,
		);
		expect(handled).toBe(true);
		expect(mockOpenUrl).toHaveBeenCalledWith('https://example.com');
	});

	it('opens the URL of a markdown link via the parser', () => {
		const doc = '[x](https://md.example.com)';
		const handled = handleLivePreviewLinkMousedown(
			createEvent({ meta: true, linkEl: linkWithText('x') }),
			createView(doc, 1), // cursor inside [x]
			true,
		);
		expect(handled).toBe(true);
		expect(mockOpenUrl).toHaveBeenCalledWith('https://md.example.com');
	});

	it('does not open an unsafe URL but still reports the event as handled', () => {
		const handled = handleLivePreviewLinkMousedown(
			createEvent({ meta: true, linkEl: linkWithText('javascript:alert(1)') }),
			createView('javascript:alert(1)'),
			true,
		);
		expect(handled).toBe(true);
		expect(mockOpenUrl).not.toHaveBeenCalled();
	});

	it('logs through the project logger when openUrl rejects', async () => {
		const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		mockOpenUrl.mockRejectedValueOnce(new Error('open failed'));

		handleLivePreviewLinkMousedown(
			createEvent({ meta: true, linkEl: linkWithText('https://example.com') }),
			createView('https://example.com'),
			true,
		);

		await vi.waitFor(() =>
			expect(consoleErrorSpy).toHaveBeenCalledWith(
				expect.stringContaining('LIVE-PREVIEW'),
				'Failed to open URL:',
				expect.any(Error),
			),
		);
		consoleErrorSpy.mockRestore();
	});
});

describe('handleLivePreviewLinkMousedown platform modifiers', () => {
	const URL = 'https://example.com';

	beforeEach(() => {
		vi.clearAllMocks();
		mockOpenUrl.mockResolvedValue(undefined);
	});

	function click(opts: { meta?: boolean; ctrl?: boolean; button?: number }, mac: boolean): boolean {
		return handleLivePreviewLinkMousedown(createEvent({ ...opts, linkEl: linkWithText(URL) }), createView(URL), mac);
	}

	it('macOS: Cmd+click opens the external link in the browser', () => {
		expect(click({ meta: true }, true)).toBe(true);
		expect(mockOpenUrl).toHaveBeenCalledWith(URL);
	});

	it('macOS: Ctrl+click and Cmd+Ctrl+click do not navigate (context menu)', () => {
		expect(click({ ctrl: true }, true)).toBe(false);
		expect(click({ meta: true, ctrl: true }, true)).toBe(false);
		expect(mockOpenUrl).not.toHaveBeenCalled();
	});

	it('Windows/Linux: Ctrl+click opens the external link in the browser', () => {
		expect(click({ ctrl: true }, false)).toBe(true);
		expect(mockOpenUrl).toHaveBeenCalledWith(URL);
	});

	it('Windows/Linux: Meta+click does not navigate', () => {
		expect(click({ meta: true }, false)).toBe(false);
		expect(mockOpenUrl).not.toHaveBeenCalled();
	});

	it('a plain click places the cursor (not handled) on both platforms', () => {
		expect(click({}, true)).toBe(false);
		expect(click({}, false)).toBe(false);
		expect(mockOpenUrl).not.toHaveBeenCalled();
	});

	it('a right click does not navigate, with or without the modifier', () => {
		expect(click({ button: 2 }, true)).toBe(false);
		expect(click({ button: 2, meta: true }, true)).toBe(false);
		expect(click({ button: 2 }, false)).toBe(false);
		expect(click({ button: 2, ctrl: true }, false)).toBe(false);
		expect(mockOpenUrl).not.toHaveBeenCalled();
	});
});

describe('handleLivePreviewTagMousedown', () => {
	/** Stands in for a `.cm-lp-tag` element; the handler reads the tag from the document, never from it. */
	const tagEl = { textContent: 'ignored' } as unknown as HTMLElement;

	beforeEach(() => vi.clearAllMocks());

	function click(
		doc: string,
		pos: number,
		opts: { meta?: boolean; ctrl?: boolean; alt?: boolean; shift?: boolean; button?: number; el?: HTMLElement | null },
		mac: boolean,
	): { handled: boolean; event: MouseEvent } {
		const event = createEvent({ ...opts, linkEl: opts.el === undefined ? tagEl : opts.el });
		return { handled: handleLivePreviewTagMousedown(event, createView(doc, pos), mac), event };
	}

	it('macOS: Cmd+click opens the tag search and keeps the cursor where it was', () => {
		const { handled, event } = click('see #work today', 4, { meta: true }, true);
		expect(handled).toBe(true);
		expect(event.preventDefault).toHaveBeenCalled();
		expect(mockOpenTagSearch).toHaveBeenCalledWith('work');
	});

	it('Windows/Linux: Ctrl+click opens the tag search', () => {
		expect(click('see #work today', 4, { ctrl: true }, false).handled).toBe(true);
		expect(mockOpenTagSearch).toHaveBeenCalledWith('work');
	});

	it('searches the full nested tag from any part of the pill', () => {
		click('x #area/sub y', 8, { meta: true }, true);
		expect(mockOpenTagSearch).toHaveBeenCalledWith('area/sub');
	});

	it('picks the tag under the pill when a line has several', () => {
		click('#one and #two', 9, { meta: true }, true);
		expect(mockOpenTagSearch).toHaveBeenCalledWith('two');
	});

	it('reads the tag from a line other than the first', () => {
		click('intro\n#later', 6, { meta: true }, true);
		expect(mockOpenTagSearch).toHaveBeenCalledWith('later');
	});

	it('falls through to CodeMirror on a plain click, another button or another modifier', () => {
		const doc = 'see #work today';
		const cases = [
			click(doc, 4, {}, true),
			click(doc, 4, {}, false),
			click(doc, 4, { button: 1, meta: true }, true),
			click(doc, 4, { button: 2, meta: true }, true),
			click(doc, 4, { alt: true }, true),
			click(doc, 4, { shift: true }, true),
			click(doc, 4, { ctrl: true }, true),
			click(doc, 4, { meta: true, ctrl: true }, true),
			click(doc, 4, { meta: true }, false),
		];
		for (const { handled, event } of cases) {
			expect(handled).toBe(false);
			expect(event.preventDefault).not.toHaveBeenCalled();
		}
		expect(mockOpenTagSearch).not.toHaveBeenCalled();
	});

	it('falls through when the click is not on a tag pill', () => {
		expect(click('see #work today', 4, { meta: true, el: null }, true).handled).toBe(false);
		expect(mockOpenTagSearch).not.toHaveBeenCalled();
	});

	it('falls through when the document holds no tag at the pill position', () => {
		expect(click('plain text', 2, { meta: true }, true).handled).toBe(false);
		expect(mockOpenTagSearch).not.toHaveBeenCalled();
	});
});
