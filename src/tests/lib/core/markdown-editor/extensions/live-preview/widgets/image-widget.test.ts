// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { editorHost, NOOP_HOST } from '#lib/core/markdown-editor/editor-host.js';
import { ImageWidget } from '#lib/core/markdown-editor/extensions/live-preview/widgets.js';

/** The host's asset URL for a file path, shaped like Tauri's `convertFileSrc`. */
const assetUrl = vi.fn((path: string) => `asset://localhost/${encodeURIComponent(path)}`);

/** A view whose editor host turns file paths into asset URLs. */
function hostView(): EditorView {
	return new EditorView({
		state: EditorState.create({ doc: '', extensions: editorHost.of({ ...NOOP_HOST, assetUrl }) }),
	});
}

beforeEach(() => {
	assetUrl.mockClear();
	document.body.innerHTML = '';
});

describe('ImageWidget', () => {
	it('sets img.src directly for safe http(s) URLs', () => {
		const widget = new ImageWidget('https://example.com/x.png', 'alt');
		const dom = widget.toDOM(hostView());
		const img = dom.querySelector('img');
		expect(img?.src).toBe('https://example.com/x.png');
		expect(img?.alt).toBe('alt');
	});

	it('leaves img.src blank for unsafe URLs (e.g. javascript:)', () => {
		const widget = new ImageWidget('javascript:alert(1)', 'pwn');
		const dom = widget.toDOM(hostView());
		const img = dom.querySelector('img');
		expect(img?.getAttribute('src')).toBeNull();
	});

	it('routes file:// URLs through host.assetUrl with the decoded fs path', () => {
		const widget = new ImageWidget(
			'file:///Users/me/Desktop/Screenshots/CleanShot%202026-05-19%20at%2013.41.27.png',
			'shot',
		);
		const dom = widget.toDOM(hostView());
		const img = dom.querySelector('img') as HTMLImageElement;
		expect(img.src).toBe(
			`asset://localhost/${encodeURIComponent(
				'/Users/me/Desktop/Screenshots/CleanShot 2026-05-19 at 13.41.27.png',
			)}`,
		);
	});

	it('skips host.assetUrl when the file:// URL carries a non-local host (SMB/UNC)', () => {
		const widget = new ImageWidget(
			'file://server/share/x.png',
			'unc',
		);
		const dom = widget.toDOM(hostView());
		const img = dom.querySelector('img') as HTMLImageElement;
		// Rejected — no src assigned.
		expect(img.getAttribute('src')).toBeNull();
		expect(assetUrl).not.toHaveBeenCalled();
	});

	it('marks the image missing when the host has no asset URL for a file:// path', () => {
		const view = new EditorView({ state: EditorState.create({ doc: '' }) });
		const dom = new ImageWidget('file:///abs/x.png', 'alt').toDOM(view);
		expect(dom.querySelector('img')!.getAttribute('src')).toBeNull();
		expect(dom.classList.contains('cm-lp-image-missing')).toBe(true);
	});

	it('applies width/height styles', () => {
		const widget = new ImageWidget('https://example.com/x.png', 'alt', 100, 200);
		const dom = widget.toDOM(hostView());
		const img = dom.querySelector('img') as HTMLImageElement;
		expect(img.style.maxWidth).toBe('100px');
		expect(img.style.height).toBe('200px');
	});

	it('eq() returns true for matching url/alt/width/height', () => {
		const a = new ImageWidget('https://x', 'a', 1, 2);
		const b = new ImageWidget('https://x', 'a', 1, 2);
		expect(a.eq(b)).toBe(true);
	});

	it('eq() returns false on url mismatch', () => {
		const a = new ImageWidget('https://x', 'a');
		const b = new ImageWidget('https://y', 'a');
		expect(a.eq(b)).toBe(false);
	});
});
