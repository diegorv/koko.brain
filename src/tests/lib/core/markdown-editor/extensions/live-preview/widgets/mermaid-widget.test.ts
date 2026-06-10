// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';

// jsdom cannot run real mermaid (it needs layout APIs like getBBox), so the
// module is mocked with a deterministic renderer. The widget's caching and
// no-shared-node contract is what is under test, not mermaid itself. The real
// sanitizeMermaidSvg path stays in place.
vi.mock('mermaid', () => ({
	default: {
		initialize: vi.fn(),
		parse: vi.fn(async () => true),
		render: vi.fn(async (_id: string, source: string) => ({
			svg: `<svg id="tmp-render"><text>${source}</text></svg>`,
		})),
	},
}));

import mermaid from 'mermaid';
import {
	MermaidWidget,
	clearMermaidCache,
} from '$lib/core/markdown-editor/extensions/live-preview/widgets/mermaid-widget';

/** Flushes the widget's async render IIFE (dynamic import + parse + render). */
async function flushAsync(): Promise<void> {
	for (let i = 0; i < 4; i++) {
		await new Promise((resolve) => setTimeout(resolve, 0));
	}
}

const SOURCE = 'graph TD; A-->B';

describe('MermaidWidget', () => {
	beforeEach(() => {
		clearMermaidCache();
		vi.clearAllMocks();
		document.body.replaceChildren();
	});

	it('renders the diagram SVG asynchronously into the container', async () => {
		const dom = new MermaidWidget(SOURCE).toDOM();
		expect(dom.className).toBe('cm-lp-mermaid');

		await flushAsync();

		const diagram = dom.querySelector('.cm-lp-mermaid-diagram');
		expect(diagram?.querySelector('svg')).not.toBeNull();
		// The temp render id is stripped before display/caching.
		expect(diagram?.querySelector('svg')?.hasAttribute('id')).toBe(false);
	});

	it('renders an error container for an empty source without invoking mermaid', () => {
		const dom = new MermaidWidget('   ').toDOM();

		expect(dom.querySelector('.cm-lp-mermaid-error')?.textContent).toBe('Empty mermaid diagram');
		expect(mermaid.render).not.toHaveBeenCalled();
	});

	it('never hands the same DOM node to two widgets with the same source', async () => {
		// Regression: CodeMirror builds new lines detached, so two widgets for a
		// duplicated diagram can both call toDOM() while nothing is connected.
		// Sharing the cached node moves it to the last widget and blanks the
		// first occurrence.
		const first = new MermaidWidget(SOURCE).toDOM();
		await flushAsync();
		expect(first.isConnected).toBe(false);

		const second = new MermaidWidget(SOURCE).toDOM();
		await flushAsync();

		expect(second).not.toBe(first);
		expect(first.querySelector('.cm-lp-mermaid-diagram svg')).not.toBeNull();
		expect(second.querySelector('.cm-lp-mermaid-diagram svg')).not.toBeNull();
	});

	it('reuses the cached SVG — mermaid.render runs once per source', async () => {
		new MermaidWidget(SOURCE).toDOM();
		await flushAsync();

		const second = new MermaidWidget(SOURCE).toDOM();
		await flushAsync();

		expect(mermaid.render).toHaveBeenCalledTimes(1);
		expect(second.querySelector('.cm-lp-mermaid-diagram svg')).not.toBeNull();
	});

	it('clearMermaidCache forces a new mermaid render', async () => {
		new MermaidWidget(SOURCE).toDOM();
		await flushAsync();

		clearMermaidCache();
		new MermaidWidget(SOURCE).toDOM();
		await flushAsync();

		expect(mermaid.render).toHaveBeenCalledTimes(2);
	});

	it('renders an error message when parsing fails and does not cache it', async () => {
		vi.mocked(mermaid.parse).mockRejectedValueOnce(new Error('bad syntax'));

		const failed = new MermaidWidget(SOURCE).toDOM();
		await flushAsync();

		const errorEl = failed.querySelector('.cm-lp-mermaid-error');
		expect(errorEl?.textContent).toContain('Mermaid error: bad syntax');

		// The failure must not be cached: the next widget renders successfully.
		const retried = new MermaidWidget(SOURCE).toDOM();
		await flushAsync();
		expect(retried.querySelector('.cm-lp-mermaid-diagram svg')).not.toBeNull();
	});
});
