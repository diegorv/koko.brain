// @vitest-environment jsdom
import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';

vi.mock('svelte-sonner', () => ({
	toast: { error: vi.fn(), success: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

import { Prec, type Extension } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';
import { livePreviewExtensions } from '#lib/core/markdown-editor/extensions/live-preview/live-preview.js';
import { metaBindInputPlugin } from '#lib/core/markdown-editor/extensions/live-preview/plugins/meta-bind-input-plugin.js';
import { mountMarkdownView, testMarkdown, withFullParse } from '../../../test-helpers';

beforeAll(() => {
	Range.prototype.getClientRects ??= () => [] as unknown as DOMRectList;
	Range.prototype.getBoundingClientRect ??= () => new DOMRect();
});
afterEach(() => document.body.replaceChildren());

const VARIANTS: Record<string, () => Extension[]> = {
	main: () => [testMarkdown(), livePreviewExtensions({})],
	fix: () => [
		testMarkdown(),
		livePreviewExtensions({ metaBindInput: true }),
		Prec.high(metaBindInputPlugin),
	],
};

const SELECT = 'INPUT[inlineSelect(option(good, good), option(bad, bad)):mood]';

function mount(body: string, variant: string): EditorView {
	const doc = `---\nmood: good\n---\n# Daily\n\n${body}\n\nend\n`;
	return withFullParse(() =>
		mountMarkdownView(doc, { cursor: doc.lastIndexOf('end'), extensions: VARIANTS[variant]() }),
	);
}

/** In-place edit with the cursor elsewhere (watcher reload, link rename, undo). */
function replaceText(view: EditorView, find: string, insert: string, nth = 0) {
	const text = view.state.doc.toString();
	let from = -1;
	for (let i = 0; i <= nth; i++) from = text.indexOf(find, from + 1);
	expect(from, `"${find}" in doc`).toBeGreaterThan(-1);
	withFullParse(() => view.dispatch({ changes: { from, to: from + find.length, insert } }));
	expect(view.state.doc.toString()).toContain(insert);
}

function click(view: EditorView, selector: string) {
	const el = view.contentDOM.querySelector<HTMLElement>(selector);
	expect(el, `${selector} before`).toBeTruthy();
	withFullParse(() => {
		el!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
		el!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
	});
}

function pick(view: EditorView, value: string) {
	const sel = view.contentDOM.querySelector<HTMLSelectElement>('select.cm-lp-meta-bind-select')!;
	expect(sel).toBeTruthy();
	sel.value = value;
	withFullParse(() => sel.dispatchEvent(new Event('change')));
}

interface Case {
	body: string;
	selector: string;
	act: (v: EditorView) => void;
	expectCount?: number;
}

const CASES: Record<string, Case> = {
	'inline math: formula edited in place': {
		body: 'Area $a+b$ here',
		selector: '.cm-lp-math-inline',
		act: (v) => replaceText(v, 'a+b', 'a+c'),
	},
	'inline math at list item start: formula edited': {
		body: '- $a+b$ item',
		selector: '.cm-lp-math-inline',
		act: (v) => replaceText(v, 'a+b', 'a+c'),
	},
	'task checkbox: click': {
		body: '- [ ] buy milk',
		selector: 'input.cm-lp-task-checkbox',
		act: (v) => click(v, 'input.cm-lp-task-checkbox'),
	},
	'task checkbox inside callout: click': {
		body: '> [!todo] Tasks\n> - [ ] buy milk',
		selector: 'input.cm-lp-task-checkbox',
		act: (v) => click(v, 'input.cm-lp-task-checkbox'),
	},
	'ordered list marker: renumbered': {
		body: '1. one\n2. two',
		selector: '.cm-lp-ol-marker',
		act: (v) => replaceText(v, '2.', '7.'),
		expectCount: 2,
	},
	'markdown image: url edited in place': {
		body: '![alt](https://x.y/a.png)',
		selector: '.cm-lp-image',
		act: (v) => replaceText(v, 'a.png', 'b.png'),
	},
	'markdown image in a list item: url edited': {
		body: '- ![alt](https://x.y/a.png)',
		selector: '.cm-lp-image',
		act: (v) => replaceText(v, 'a.png', 'b.png'),
	},
	'wikilink image embed: width edited': {
		body: '![[pic.png|100]]',
		selector: '.cm-lp-image-wrapper',
		act: (v) => replaceText(v, '|100', '|200'),
	},
	'wikilink note embed: target renamed (link updater)': {
		body: 'See ![[Old Note]] there',
		selector: '.cm-lp-embed',
		act: (v) => replaceText(v, 'Old Note', 'New Note'),
	},
	'wikilink note embed: heading renamed': {
		body: '![[Note#Intro]]',
		selector: '.cm-lp-embed',
		act: (v) => replaceText(v, 'Intro', 'Outro'),
	},
	'piped table: +row': {
		body: '| a | b |\n| --- | --- |\n| 1 | 2 |',
		selector: '.cm-lp-table-wrapper',
		act: (v) => click(v, '.cm-lp-table-add-row'),
	},
	'piped table: +col': {
		body: '| a | b |\n| --- | --- |\n| 1 | 2 |',
		selector: '.cm-lp-table-wrapper',
		act: (v) => click(v, '.cm-lp-table-add-col'),
	},
	'piped table: cell select write': {
		body: `| \`${SELECT}\` | b |\n| --- | --- |\n| 1 | 2 |`,
		selector: '.cm-lp-table-wrapper',
		act: (v) => pick(v, 'bad'),
	},
	'pipe-less table: +col': {
		body: 'a | b\n--- | ---\n1 | 2',
		selector: '.cm-lp-table-wrapper',
		act: (v) => click(v, '.cm-lp-table-add-col'),
	},
	'pipe-less table starting with INPUT: +col': {
		body: `\`${SELECT}\` | b\n--- | ---\n1 | 2`,
		selector: '.cm-lp-table-wrapper',
		act: (v) => click(v, '.cm-lp-table-add-col'),
	},
	'pipe-less table starting with INPUT: +row': {
		body: `\`${SELECT}\` | b\n--- | ---\n1 | 2`,
		selector: '.cm-lp-table-wrapper',
		act: (v) => click(v, '.cm-lp-table-add-row'),
	},
	'pipe-less table starting with INPUT: another property edited (Properties panel)': {
		body: `\`${SELECT}\` | b\n--- | ---\n1 | 2`,
		selector: '.cm-lp-table-wrapper',
		act: (v) => replaceText(v, 'mood: good', 'mood: good\ntitle: x'),
	},
	'pipe-less table starting with inline code: +col': {
		body: '`code` | b\n--- | ---\n1 | 2',
		selector: '.cm-lp-table-wrapper',
		act: (v) => click(v, '.cm-lp-table-add-col'),
	},
	'pipe-less table starting with [[link]]: +col': {
		body: '[[Note]] | b\n--- | ---\n1 | 2',
		selector: '.cm-lp-table-wrapper',
		act: (v) => click(v, '.cm-lp-table-add-col'),
	},
	'pipe-less table starting with **bold**: +col': {
		body: '**a** | b\n--- | ---\n1 | 2',
		selector: '.cm-lp-table-wrapper',
		act: (v) => click(v, '.cm-lp-table-add-col'),
	},
	'pipe-less table starting with $math$: +col': {
		body: '$x$ | b\n--- | ---\n1 | 2',
		selector: '.cm-lp-table-wrapper',
		act: (v) => click(v, '.cm-lp-table-add-col'),
	},
	'table inside a callout: +row': {
		body: '> [!note] T\n> | a | b |\n> | --- | --- |\n> | 1 | 2 |',
		selector: '.cm-lp-table-wrapper',
		act: (v) => click(v, '.cm-lp-table-add-row'),
	},
	'table inside a blockquote: +row': {
		body: '> | a | b |\n> | --- | --- |\n> | 1 | 2 |',
		selector: '.cm-lp-table-wrapper',
		act: (v) => click(v, '.cm-lp-table-add-row'),
	},
	'table in a list item: +row': {
		body: '- item\n\n  | a | b |\n  | --- | --- |\n  | 1 | 2 |',
		selector: '.cm-lp-table-wrapper',
		act: (v) => click(v, '.cm-lp-table-add-row'),
	},
	'callout title starting with [[link]]: fold toggle': {
		body: '> [!note]- [[Note]] title\n> body',
		selector: '.cm-lp-callout-fold',
		act: (v) => click(v, '.cm-lp-callout-fold'),
	},
	'callout title starting with `code`: fold toggle': {
		body: '> [!note]- `code` title\n> body',
		selector: '.cm-lp-callout-fold',
		act: (v) => click(v, '.cm-lp-callout-fold'),
	},
	'callout: type switched via popover': {
		body: '> [!note] Title\n> body',
		selector: '.cm-lp-callout-type-switcher',
		act: (v) => click(v, '.cm-lp-callout-type-option'),
	},
	'callout with INPUT title: type switched': {
		body: `> [!note] \`${SELECT}\`\n> body`,
		selector: 'select.cm-lp-meta-bind-select',
		act: (v) => click(v, '.cm-lp-callout-type-option'),
	},
	'code block: edit in body (cursor elsewhere)': {
		body: '```js\nconst a = 1;\n```',
		selector: '.cm-lp-codeblock',
		act: (v) => replaceText(v, 'a = 1', 'a = 2'),
	},
	'code block in blockquote: edit in body': {
		body: '> ```js\n> const a = 1;\n> ```',
		selector: '.cm-lp-codeblock',
		act: (v) => replaceText(v, 'a = 1', 'a = 2'),
	},
	'code block in callout: edit in body': {
		body: '> [!note] T\n> ```js\n> const a = 1;\n> ```',
		selector: '.cm-lp-codeblock',
		act: (v) => replaceText(v, 'a = 1', 'a = 2'),
	},
	'code block in list item: edit in body': {
		body: '- item\n\n  ```js\n  const a = 1;\n  ```',
		selector: '.cm-lp-codeblock',
		act: (v) => replaceText(v, 'a = 1', 'a = 2'),
	},
	'block math: formula edited in place': {
		body: '$$\na+b\n$$',
		selector: '.cm-lp-math-block',
		act: (v) => replaceText(v, 'a+b', 'a+c'),
	},
	'block math in blockquote: formula edited': {
		body: '> $$\n> a+b\n> $$',
		selector: '.cm-lp-math-block',
		act: (v) => replaceText(v, 'a+b', 'a+c'),
	},
	'meta-bind button: label edited in place': {
		body: '```meta-bind-button\nlabel: Go\nstyle: primary\nactions:\n  - type: updateMetadata\n    bindTarget: mood\n    evaluate: false\n    value: bad\n```',
		selector: '.cm-lp-meta-bind-button-container',
		act: (v) => replaceText(v, 'label: Go', 'label: Run'),
	},
	'meta-bind button: click updateMetadata': {
		body: '```meta-bind-button\nlabel: Go\nstyle: primary\nactions:\n  - type: updateMetadata\n    bindTarget: mood\n    evaluate: false\n    value: bad\n```',
		selector: '.cm-lp-meta-bind-button-container',
		act: (v) => click(v, '.cm-lp-meta-bind-button-container button'),
	},
	'audio: src edited in place': {
		body: '<audio src="a.mp3"></audio>',
		selector: 'audio',
		act: (v) => replaceText(v, 'a.mp3', 'b.mp3'),
	},
	'video: src edited in place': {
		body: '<video src="a.mp4"></video>',
		selector: 'video',
		act: (v) => replaceText(v, 'a.mp4', 'b.mp4'),
	},
	'meta-bind select + inline math on one line: write': {
		body: `$x$ \`${SELECT}\``,
		selector: '.cm-lp-math-inline',
		act: (v) => pick(v, 'bad'),
	},
	'meta-bind toggle in a task item: write': {
		body: '- [ ] `INPUT[toggle():done]` task',
		selector: 'input.cm-lp-task-checkbox',
		act: (v) => {
			const cb = v.contentDOM.querySelector<HTMLInputElement>('input.cm-lp-meta-bind-toggle-input')!;
			cb.checked = true;
			withFullParse(() => cb.dispatchEvent(new Event('change')));
		},
	},
};

for (const variant of Object.keys(VARIANTS)) {
	describe(`[${variant}] element stays drawn after an in-place update`, () => {
		for (const [name, c] of Object.entries(CASES)) {
			it(name, () => {
				const view = mount(c.body, variant);
				const before = view.contentDOM.querySelectorAll(c.selector).length;
				expect(before, `${c.selector} drawn before`).toBe(c.expectCount ?? 1);
				c.act(view);
				const after = view.contentDOM.querySelectorAll(c.selector).length;
				expect(after, `${c.selector} drawn after`).toBe(before);
				view.destroy();
			});
		}
	});
}
