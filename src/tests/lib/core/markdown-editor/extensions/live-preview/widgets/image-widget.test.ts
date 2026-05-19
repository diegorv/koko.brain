// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@tauri-apps/api/core', () => ({
	convertFileSrc: (path: string, protocol: string = 'asset') =>
		`${protocol}://localhost/${encodeURIComponent(path)}`,
}));

import { ImageWidget } from '$lib/core/markdown-editor/extensions/live-preview/widgets';

async function flushMicrotasks(): Promise<void> {
	for (let i = 0; i < 8; i++) {
		await new Promise<void>((resolve) => setTimeout(resolve, 0));
	}
}

beforeEach(() => {
	document.body.innerHTML = '';
});

describe('ImageWidget', () => {
	it('sets img.src directly for safe http(s) URLs', () => {
		const widget = new ImageWidget('https://example.com/x.png', 'alt');
		const dom = widget.toDOM();
		const img = dom.querySelector('img');
		expect(img?.src).toBe('https://example.com/x.png');
		expect(img?.alt).toBe('alt');
	});

	it('leaves img.src blank for unsafe URLs (e.g. javascript:)', () => {
		const widget = new ImageWidget('javascript:alert(1)', 'pwn');
		const dom = widget.toDOM();
		const img = dom.querySelector('img');
		expect(img?.getAttribute('src')).toBeNull();
	});

	it('routes file:// URLs through convertFileSrc with the decoded fs path', async () => {
		const widget = new ImageWidget(
			'file:///Users/me/Desktop/Screenshots/CleanShot%202026-05-19%20at%2013.41.27.png',
			'shot',
		);
		const dom = widget.toDOM();
		const img = dom.querySelector('img') as HTMLImageElement;
		// Async resolution — empty until microtasks flush.
		expect(img.getAttribute('src')).toBeNull();
		await flushMicrotasks();
		expect(img.src).toBe(
			`asset://localhost/${encodeURIComponent(
				'/Users/me/Desktop/Screenshots/CleanShot 2026-05-19 at 13.41.27.png',
			)}`,
		);
	});

	it('skips convertFileSrc when the file:// URL carries a non-local host (SMB/UNC)', async () => {
		const widget = new ImageWidget(
			'file://server/share/x.png',
			'unc',
		);
		const dom = widget.toDOM();
		const img = dom.querySelector('img') as HTMLImageElement;
		await flushMicrotasks();
		// Rejected — no src assigned.
		expect(img.getAttribute('src')).toBeNull();
	});

	it('does not assign src after the widget is destroyed (no late-write into detached DOM)', async () => {
		const widget = new ImageWidget('file:///abs/x.png', 'alt');
		const dom = widget.toDOM();
		const img = dom.querySelector('img') as HTMLImageElement;
		widget.destroy();
		await flushMicrotasks();
		expect(img.getAttribute('src')).toBeNull();
	});

	it('applies width/height styles', () => {
		const widget = new ImageWidget('https://example.com/x.png', 'alt', 100, 200);
		const dom = widget.toDOM();
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
