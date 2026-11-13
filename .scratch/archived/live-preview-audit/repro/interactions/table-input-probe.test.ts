// @vitest-environment jsdom
import { it, beforeAll } from 'vitest';
import { livePreviewExtensions } from '#lib/core/markdown-editor/extensions/live-preview/live-preview.js';
import { mountMarkdownView, testMarkdown, withFullParse } from '../../../test-helpers';

beforeAll(() => {
	Range.prototype.getClientRects ??= () => [] as unknown as DOMRectList;
	Range.prototype.getBoundingClientRect ??= () => new DOMRect();
});

const SELECT = '`INPUT[inlineSelect(option(good, good), option(bad, bad)):mood]`';

for (const [name, body] of [
	['piped header', `| ${SELECT} | v |\n| --- | --- |\n| m | n |`],
	['piped row', `| k | v |\n| --- | --- |\n| m | ${SELECT} |`],
	['pipeless header', `${SELECT} | v\n--- | ---\nm | n`],
	['comment', `x %%${SELECT}%% y`],
	['frontmatter', null],
] as const) {
	it(name, () => {
		const doc = body === null
			? `---\nmood: good\nnote: ${SELECT}\n---\n# T\n\nend\n`
			: `---\nmood: good\n---\n# T\n\n${body}\n\nend\n`;
		const view = withFullParse(() => mountMarkdownView(doc, { cursor: doc.indexOf('end'), extensions: [testMarkdown(), livePreviewExtensions({})] }));
		const sels = [...view.contentDOM.querySelectorAll('select.cm-lp-meta-bind-select')];
		const report = () => `${name}: tables=${view.contentDOM.querySelectorAll('.cm-lp-table-wrapper').length} selects=${view.contentDOM.querySelectorAll('select.cm-lp-meta-bind-select').length} inTable=${[...view.contentDOM.querySelectorAll('select.cm-lp-meta-bind-select')].map((s) => !!s.closest('.cm-lp-table-wrapper')).join(',')}`;
		console.log('MOUNT', report());
		if (sels[0]) {
			(sels[0] as HTMLSelectElement).value = 'bad';
			withFullParse(() => sels[0].dispatchEvent(new Event('change')));
			console.log('AFTER', report());
		}
	});
}
