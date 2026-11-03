// @vitest-environment jsdom
import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';

vi.mock('svelte-sonner', () => ({
	toast: { error: vi.fn(), success: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

import type { EditorView } from '@codemirror/view';
import type { Extension } from '@codemirror/state';
import { livePreviewExtensions } from '#lib/core/markdown-editor/extensions/live-preview/live-preview.js';
import { fencedBlockRenderers } from '#lib/core/markdown-editor/extensions/live-preview/core/fenced-block-renderers.js';
import { mountMarkdownView, testMarkdown, withFullParse, fakeBlockRenderer } from '../../test-helpers';

/**
 * The four special fences (meta-bind-button, mermaid, queryjs, collection)
 * render inside a callout, a blockquote and a list item, not only at column 0.
 * The cursor sits on the trailing "end" line, so every block is unrevealed.
 */

beforeAll(() => {
	Range.prototype.getClientRects ??= () => [] as unknown as DOMRectList;
	Range.prototype.getBoundingClientRect ??= () => new DOMRect();
});
afterEach(() => {
	document.body.replaceChildren();
});

function mount(doc: string, extra: Extension[] = []): EditorView {
	return withFullParse(() =>
		mountMarkdownView(doc, {
			cursor: doc.lastIndexOf('end'),
			extensions: [testMarkdown(), livePreviewExtensions({}), ...extra],
		}),
	);
}
const q = <T extends HTMLElement>(v: EditorView, s: string) => v.contentDOM.querySelector<T>(s);

/** Wraps a top-level block in each container, prefixing every one of its lines. */
const CONTAINERS: [string, (block: string) => string][] = [
	['top level', (b) => b],
	['a callout', (b) => `> [!note] T\n${b.split('\n').map((l) => '> ' + l).join('\n')}`],
	['a blockquote', (b) => b.split('\n').map((l) => '> ' + l).join('\n')],
	['a list item', (b) => `- item\n\n${b.split('\n').map((l) => '  ' + l).join('\n')}`],
];

const BUTTON = '```meta-bind-button\nlabel: Go\nstyle: primary\nactions:\n  - type: open\n    link: x\n```';

/** Each special fence, the selector its rendered widget carries, and the renderer it needs. */
const FENCES: { name: string; block: string; selector: string; extra: Extension[] }[] = [
	{ name: 'meta-bind-button', block: BUTTON, selector: '.cm-lp-meta-bind-btn', extra: [] },
	{ name: 'mermaid', block: '```mermaid\ngraph TD\nA-->B\n```', selector: '.cm-lp-mermaid', extra: [] },
	{
		name: 'queryjs',
		block: '```queryjs\nkb.x\n```',
		selector: '.cm-test-fenced-block',
		extra: [fencedBlockRenderers.of(fakeBlockRenderer('queryjs'))],
	},
	{
		name: 'collection',
		block: '```collection\nviews: []\n```',
		selector: '.cm-test-fenced-block',
		extra: [fencedBlockRenderers.of(fakeBlockRenderer('collection'))],
	},
];

for (const { name, block, selector, extra } of FENCES) {
	describe(`${name} fence in a container`, () => {
		for (const [where, wrap] of CONTAINERS) {
			it(`renders in ${where}`, () => {
				const view = mount(`# H\n\n${wrap(block)}\n\nend\n`, extra);
				expect(q(view, selector), `${name} drawn`).not.toBeNull();
				view.destroy();
			});
		}
	});
}

describe('fake renderer source inside a container', () => {
	it('a queryjs block in a callout receives its source without the quote prefix', () => {
		const doc = '> [!note] T\n> ```queryjs\n> const a = 1;\n>   kb.x(a)\n> ```\n\nend\n';
		const view = mount(doc, [fencedBlockRenderers.of(fakeBlockRenderer('queryjs'))]);
		expect(q(view, '.cm-test-fenced-block')?.textContent).toBe('const a = 1;\n  kb.x(a)');
		view.destroy();
	});
});

describe('meta-bind-button in a callout', () => {
	const FM = '---\nmood: good\n---\n';
	const doc = `${FM}> [!note] T\n> \`\`\`meta-bind-button\n> label: Bad\n> style: primary\n> actions:\n>   - type: updateMetadata\n>     bindTarget: mood\n>     evaluate: false\n>     value: bad\n> \`\`\`\n\nend\n`;

	it('shows its label', () => {
		const view = mount(doc);
		expect(q(view, '.cm-lp-meta-bind-btn')?.textContent).toBe('Bad');
		view.destroy();
	});

	it('runs its actions', async () => {
		const view = mount(doc);
		const button = q<HTMLButtonElement>(view, '.cm-lp-meta-bind-btn')!;
		expect(button).not.toBeNull();
		button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		await new Promise((r) => setTimeout(r, 50));
		expect(view.state.doc.toString()).toContain('mood: bad');
		view.destroy();
	});
});

describe('a language that only starts with a special name', () => {
	it('```mermaid-js in a callout is a normal code block', () => {
		const view = mount('> [!note] T\n> ```mermaid-js\n> graph TD\n> ```\n\nend\n');
		expect(q(view, '.cm-lp-mermaid')).toBeNull();
		expect(q(view, '.cm-lp-codeblock')).not.toBeNull();
		view.destroy();
	});
});
