// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/api', () => ({
	convertFileSrc: (path: string, protocol: string = 'asset') =>
		`${protocol}://localhost/${encodeURIComponent(path)}`,
}));

import {
	resolveImageEmbedAssetUrl,
	WikilinkImageEmbedWidget,
} from '$lib/core/markdown-editor/extensions/live-preview/widgets';
import { fsStore } from '$lib/core/filesystem/fs.store.svelte';
import type { FileTreeNode } from '$lib/core/filesystem/fs.types';

function makeFile(path: string): FileTreeNode {
	const segments = path.split('/');
	return { name: segments[segments.length - 1], path, isDirectory: false };
}

function makeDir(path: string, children: FileTreeNode[]): FileTreeNode {
	const segments = path.split('/');
	return { name: segments[segments.length - 1], path, isDirectory: true, children };
}

async function flushMicrotasks(): Promise<void> {
	for (let i = 0; i < 8; i++) {
		await new Promise<void>((resolve) => setTimeout(resolve, 0));
	}
}

beforeEach(() => {
	fsStore.setFileTree([]);
});

describe('resolveImageEmbedAssetUrl', () => {
	it('resolves a bare-filename target to an asset URL via fileTree lookup', async () => {
		fsStore.setFileTree([
			makeDir('/vault/Resources', [makeFile('/vault/Resources/img.png')]),
		]);

		const url = await resolveImageEmbedAssetUrl('img.png');

		expect(url).toBe(
			`asset://localhost/${encodeURIComponent('/vault/Resources/img.png')}`,
		);
	});

	it('resolves a vault-relative path target by basename match', async () => {
		fsStore.setFileTree([
			makeDir('/vault/Resources', [
				makeDir('/vault/Resources/images', [
					makeFile('/vault/Resources/images/9902bb9ff321.png'),
				]),
			]),
		]);

		const url = await resolveImageEmbedAssetUrl(
			'Resources/images/9902bb9ff321.png',
		);

		expect(url).toBe(
			`asset://localhost/${encodeURIComponent('/vault/Resources/images/9902bb9ff321.png')}`,
		);
	});

	it('returns null when the target cannot be resolved', async () => {
		fsStore.setFileTree([makeFile('/vault/other.png')]);

		const url = await resolveImageEmbedAssetUrl('missing.png');

		expect(url).toBeNull();
	});

	it('returns null for an empty target', async () => {
		fsStore.setFileTree([makeFile('/vault/img.png')]);

		const url = await resolveImageEmbedAssetUrl('');

		expect(url).toBeNull();
	});
});

describe('WikilinkImageEmbedWidget', () => {
	describe('toDOM', () => {
		it('renders the placeholder synchronously, then sets img.src once resolution completes', async () => {
			fsStore.setFileTree([makeFile('/vault/img.png')]);
			const widget = new WikilinkImageEmbedWidget('img.png', null);

			const dom = widget.toDOM();

			expect(dom.classList.contains('cm-lp-image-wrapper')).toBe(true);
			const img = dom.querySelector('img') as HTMLImageElement;
			expect(img).not.toBeNull();
			expect(img.alt).toBe('img.png');
			expect(img.getAttribute('src')).toBeFalsy();

			await flushMicrotasks();

			expect(img.src).toBe(
				`asset://localhost/${encodeURIComponent('/vault/img.png')}`,
			);
			expect(dom.classList.contains('cm-lp-image-missing')).toBe(false);
		});

		it('renders an error placeholder when the target cannot be resolved', async () => {
			fsStore.setFileTree([makeFile('/vault/other.png')]);
			const widget = new WikilinkImageEmbedWidget('missing.png', null);

			const dom = widget.toDOM();
			await flushMicrotasks();

			expect(dom.classList.contains('cm-lp-image-missing')).toBe(true);
			expect(dom.textContent).toContain('"missing.png" not found');
		});

		it('applies the width hint as max-width on the image', () => {
			fsStore.setFileTree([makeFile('/vault/img.png')]);
			const widget = new WikilinkImageEmbedWidget('img.png', 300);

			const dom = widget.toDOM();
			const img = dom.querySelector('img') as HTMLImageElement;

			expect(img.style.maxWidth).toBe('300px');
		});

		it('does not mutate the wrapper when destroyed before async resolution settles', async () => {
			fsStore.setFileTree([makeFile('/vault/img.png')]);
			const widget = new WikilinkImageEmbedWidget('img.png', null);

			const dom = widget.toDOM();
			widget.destroy();
			await flushMicrotasks();

			const img = dom.querySelector('img') as HTMLImageElement;
			expect(img.getAttribute('src')).toBeFalsy();
			expect(dom.classList.contains('cm-lp-image-missing')).toBe(false);
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
