// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@tauri-apps/api/core', () => ({
	convertFileSrc: (path: string, protocol: string = 'asset') =>
		`${protocol}://localhost/${encodeURIComponent(path)}`,
}));

import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { appEditorHost } from '#lib/app/editor-host.js';
import { editorHost } from '#lib/core/markdown-editor/editor-host.js';
import {
	resolveImageEmbedAssetUrl,
	WikilinkImageEmbedWidget,
} from '#lib/core/markdown-editor/extensions/live-preview/widgets.js';
import { fsStore } from '#lib/core/filesystem/fs.store.svelte.js';
import type { FileTreeNode } from '#lib/core/filesystem/fs.types.js';

function makeFile(path: string): FileTreeNode {
	const segments = path.split('/');
	return { name: segments[segments.length - 1], path, isDirectory: false };
}

function makeDir(path: string, children: FileTreeNode[]): FileTreeNode {
	const segments = path.split('/');
	return { name: segments[segments.length - 1], path, isDirectory: true, children };
}

/** A view with the app's host, which resolves against the real file tree. */
function appView(): EditorView {
	return new EditorView({ state: EditorState.create({ doc: '', extensions: editorHost.of(appEditorHost) }) });
}

beforeEach(() => {
	fsStore.setFileTree([]);
});

describe('resolveImageEmbedAssetUrl', () => {
	it('resolves a bare-filename target to an asset URL via fileTree lookup', () => {
		fsStore.setFileTree([
			makeDir('/vault/Resources', [makeFile('/vault/Resources/img.png')]),
		]);

		const url = resolveImageEmbedAssetUrl(appEditorHost, 'img.png');

		expect(url).toBe(
			`asset://localhost/${encodeURIComponent('/vault/Resources/img.png')}`,
		);
	});

	it('resolves a vault-relative path target by basename match', () => {
		fsStore.setFileTree([
			makeDir('/vault/Resources', [
				makeDir('/vault/Resources/images', [
					makeFile('/vault/Resources/images/9902bb9ff321.png'),
				]),
			]),
		]);

		const url = resolveImageEmbedAssetUrl(appEditorHost, 'Resources/images/9902bb9ff321.png');

		expect(url).toBe(
			`asset://localhost/${encodeURIComponent('/vault/Resources/images/9902bb9ff321.png')}`,
		);
	});

	it('returns null when the target cannot be resolved', () => {
		fsStore.setFileTree([makeFile('/vault/other.png')]);

		const url = resolveImageEmbedAssetUrl(appEditorHost, 'missing.png');

		expect(url).toBeNull();
	});

	it('returns null for an empty target', () => {
		fsStore.setFileTree([makeFile('/vault/img.png')]);

		const url = resolveImageEmbedAssetUrl(appEditorHost, '');

		expect(url).toBeNull();
	});
});

describe('WikilinkImageEmbedWidget', () => {
	describe('toDOM', () => {
		it('sets img.src from the resolved asset URL', () => {
			fsStore.setFileTree([makeFile('/vault/img.png')]);
			const widget = new WikilinkImageEmbedWidget('img.png', null);

			const dom = widget.toDOM(appView());

			expect(dom.classList.contains('cm-lp-image-wrapper')).toBe(true);
			const img = dom.querySelector('img') as HTMLImageElement;
			expect(img).not.toBeNull();
			expect(img.alt).toBe('img.png');
			expect(img.src).toBe(
				`asset://localhost/${encodeURIComponent('/vault/img.png')}`,
			);
			expect(dom.classList.contains('cm-lp-image-missing')).toBe(false);
		});

		it('renders an error placeholder when the target cannot be resolved', () => {
			fsStore.setFileTree([makeFile('/vault/other.png')]);
			const widget = new WikilinkImageEmbedWidget('missing.png', null);

			const dom = widget.toDOM(appView());

			expect(dom.classList.contains('cm-lp-image-missing')).toBe(true);
			expect(dom.textContent).toContain('"missing.png" not found');
		});

		it('applies the width hint as max-width on the image', () => {
			fsStore.setFileTree([makeFile('/vault/img.png')]);
			const widget = new WikilinkImageEmbedWidget('img.png', 300);

			const dom = widget.toDOM(appView());
			const img = dom.querySelector('img') as HTMLImageElement;

			expect(img.style.maxWidth).toBe('300px');
		});
	});

	describe('eq', () => {
		it('returns true for identical target and width', () => {
			const a = new WikilinkImageEmbedWidget('img.png', 300);
			const b = new WikilinkImageEmbedWidget('img.png', 300);
			expect(a.eq(b)).toBe(true);
		});

		it('returns false when target differs', () => {
			const a = new WikilinkImageEmbedWidget('a.png', null);
			const b = new WikilinkImageEmbedWidget('b.png', null);
			expect(a.eq(b)).toBe(false);
		});

		it('returns false when width differs', () => {
			const a = new WikilinkImageEmbedWidget('img.png', 300);
			const b = new WikilinkImageEmbedWidget('img.png', 600);
			expect(a.eq(b)).toBe(false);
		});

		it('returns false when one has width null and the other does not', () => {
			const a = new WikilinkImageEmbedWidget('img.png', null);
			const b = new WikilinkImageEmbedWidget('img.png', 300);
			expect(a.eq(b)).toBe(false);
		});
	});

	describe('ignoreEvent', () => {
		it('ignores all events so the widget does not capture clicks', () => {
			const widget = new WikilinkImageEmbedWidget('img.png', null);
			expect(widget.ignoreEvent()).toBe(true);
		});
	});
});
