import { describe, it, expect } from 'vitest';
import { tagHandler } from '#lib/core/markdown-editor/extensions/live-preview/inline/handlers/tag-handler.js';
import { buildInlineDecorations } from '#lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin.js';
import { createMarkdownState } from '../../../../test-helpers';

interface DecoSpec { from: number; to: number; class: string; replace: boolean }

function build(doc: string, cursor?: number): DecoSpec[] {
	const state = createMarkdownState(doc, { cursor });
	const set = buildInlineDecorations(
		state,
		[{ from: 0, to: state.doc.length }],
		{ nodeHandlers: [], lineHandlers: [tagHandler] },
	);
	const result: DecoSpec[] = [];
	for (const iter = set.iter(); iter.value; iter.next()) {
		result.push({
			from: iter.from,
			to: iter.to,
			class: (iter.value.spec as { class?: string }).class ?? '',
			replace: iter.value.point,
		});
	}
	return result;
}

/** The text each `cm-lp-tag` mark covers. */
function styled(doc: string, cursor?: number): string[] {
	return build(doc, cursor)
		.filter((d) => d.class === 'cm-lp-tag')
		.map((d) => doc.slice(d.from, d.to));
}

describe('tagHandler', () => {
	it('marks the # and the tag name, without replacing anything', () => {
		const doc = 'see #work today';
		expect(build(doc, doc.length)).toEqual([{ from: 4, to: 9, class: 'cm-lp-tag', replace: false }]);
	});

	it('stays styled when the cursor is on the tag line', () => {
		expect(styled('see #work today', 6)).toEqual(['#work']);
	});

	it('styles every tag on a line, and tags at line start', () => {
		expect(styled('#a text #b\n#c')).toEqual(['#a', '#b', '#c']);
	});

	it('styles a nested tag as one mark, without a trailing slash', () => {
		expect(styled('x #area/sub y #top/ z')).toEqual(['#area/sub', '#top']);
	});

	it('does not style what the indexer does not count as a tag', () => {
		const doc = 'foo#bar #1984 [[Note#Heading]] https://example.com/page#anchor\n\n# Heading';
		expect(styled(doc)).toEqual([]);
	});

	it('does not style inside inline code', () => {
		expect(styled('a ` #code` b #real')).toEqual(['#real']);
	});

	it('does not style inside a fenced code block', () => {
		expect(styled('```\n#code\n```\n#real')).toEqual(['#real']);
	});

	it('does not style inside frontmatter', () => {
		expect(styled('---\ntitle: #fm\n---\n#real')).toEqual(['#real']);
	});

	it('does not style inside an HTML comment', () => {
		expect(styled('a <!-- #hidden --> b #real')).toEqual(['#real']);
		expect(styled('<!--\n#block\n-->\n\n#real')).toEqual(['#real']);
	});

	it('styles nothing in a note without tags', () => {
		expect(build('')).toEqual([]);
		expect(build('plain text')).toEqual([]);
	});
});
