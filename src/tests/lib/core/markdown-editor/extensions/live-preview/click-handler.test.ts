import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockOpenUrl = vi.fn();
vi.mock('@tauri-apps/plugin-opener', () => ({
	openUrl: (...args: unknown[]) => mockOpenUrl(...args),
}));

// No mocks for stores, logic, or the link parser — use real implementations per CLAUDE.md.

import { handleLivePreviewLinkMousedown } from '$lib/core/markdown-editor/extensions/live-preview/click-handler';
import { createMarkdownState } from '../../test-helpers';

/** Builds a fake mouse event whose target.closest resolves to the given link element. */
function createEvent(opts: { meta?: boolean; ctrl?: boolean; linkEl?: HTMLElement | null }): MouseEvent {
	const target = { closest: vi.fn(() => opts.linkEl ?? null) };
	return {
		metaKey: opts.meta ?? false,
		ctrlKey: opts.ctrl ?? false,
		target,
		preventDefault: vi.fn(),
	} as unknown as MouseEvent;
}

/** Builds a fake view backed by a real markdown EditorState (so syntaxTree works). */
function createView(doc: string, posAtDOM = 0): any {
	return {
		posAtDOM: vi.fn(() => posAtDOM),
		state: createMarkdownState(doc),
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

	it('returns false when neither Cmd nor Ctrl is held', () => {
		const handled = handleLivePreviewLinkMousedown(createEvent({}), createView('plain text'));
		expect(handled).toBe(false);
		expect(mockOpenUrl).not.toHaveBeenCalled();
	});

	it('returns false when there is no .cm-lp-link under the cursor', () => {
		const handled = handleLivePreviewLinkMousedown(
			createEvent({ meta: true, linkEl: null }),
			createView('plain text'),
		);
		expect(handled).toBe(false);
		expect(mockOpenUrl).not.toHaveBeenCalled();
	});

	it('opens a safe bare URL from the link text and returns true', () => {
		const handled = handleLivePreviewLinkMousedown(
			createEvent({ meta: true, linkEl: linkWithText('https://example.com') }),
			createView('https://example.com'),
		);
		expect(handled).toBe(true);
		expect(mockOpenUrl).toHaveBeenCalledWith('https://example.com');
	});

	it('opens the URL of a markdown link via the parser', () => {
		const doc = '[x](https://md.example.com)';
		const handled = handleLivePreviewLinkMousedown(
			createEvent({ meta: true, linkEl: linkWithText('x') }),
			createView(doc, 1), // cursor inside [x]
		);
		expect(handled).toBe(true);
		expect(mockOpenUrl).toHaveBeenCalledWith('https://md.example.com');
	});

	it('does not open an unsafe URL but still reports the event as handled', () => {
		const handled = handleLivePreviewLinkMousedown(
			createEvent({ meta: true, linkEl: linkWithText('javascript:alert(1)') }),
			createView('javascript:alert(1)'),
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
