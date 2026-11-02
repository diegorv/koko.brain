// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { editorHost, NOOP_HOST } from '#lib/core/markdown-editor/editor-host.js';
import { ImageWidget } from '#lib/core/markdown-editor/extensions/live-preview/widgets.js';
import { imagePlugin } from '#lib/core/markdown-editor/extensions/live-preview/plugins/image-plugin.js';
import { createMarkdownState, testMarkdown } from '../../../test-helpers';

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

describe('F105: a raw % in a file:// image URL must not throw out of toDOM', () => {
	const host = { ...NOOP_HOST, assetUrl };
	const BAD_URL = 'file:///Users/me/100%.png';

	it('ImageWidget.toDOM does not throw and leaves img.src empty', () => {
		let dom: HTMLElement | null = null;
		expect(() => {
			dom = new ImageWidget(BAD_URL, 'shot').toDOM(hostView());
		}).not.toThrow();
		expect(dom!.querySelector('img')!.getAttribute('src')).toBeNull();
		expect(assetUrl).not.toHaveBeenCalled();
	});

	it('mounting a note with that image through the real image plugin renders the rest of the note', () => {
		const doc = `intro\n\n![shot](${BAD_URL})\n\ntext`;
		let view: EditorView | null = null;
		expect(() => {
			view = new EditorView({
				state: createMarkdownState(doc, { extensions: [testMarkdown(), editorHost.of(host), imagePlugin], cursor: 0 }),
				parent: document.body.appendChild(document.createElement('div')),
			});
		}).not.toThrow();
		expect(view!.contentDOM.textContent).toContain('intro');
		expect(view!.contentDOM.textContent).toContain('text');
		view!.destroy();
	});
});

describe('F105 escalation: a full doc replace onto the bad image', () => {
	const host = { ...NOOP_HOST, assetUrl };

	it('switching to a note with the bad image, then to another note, renders each note and never throws', () => {
		const view = new EditorView({
			state: createMarkdownState('first note', { extensions: [testMarkdown(), editorHost.of(host), imagePlugin], cursor: 0 }),
			parent: document.body.appendChild(document.createElement('div')),
		});
		const bad = 'intro\n\n![shot](file:///Users/me/100%.png)\n\ntext';
		// Same shape as the MarkdownEditor.svelte tab-switch dispatch (full doc replace).
		expect(() => view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: bad } })).not.toThrow();
		expect(view.state.doc.toString()).toBe(bad);
		expect(view.contentDOM.textContent).toContain('intro');
		expect(() => view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: 'third note body' } })).not.toThrow();
		expect(view.contentDOM.textContent).toBe('third note body');
		view.destroy();
	});
});
