import { syntaxTree } from '@codemirror/language';
import { findInlineTags } from '#lib/utils/tag-extraction.js';
import { tagDeco } from '../../styles';
import { frontmatterSlice } from '../../core/frontmatter-slice';
import type { LineHandler } from '../inline-formatting-plugin';

/** Lezer nodes whose text the indexer strips before it looks for tags. */
const SKIPPED_NODES = new Set(['InlineCode', 'Comment']);

/** `scratch` key for the end offset of the frontmatter, computed once per build. */
const FRONTMATTER_END_KEY = 'tag:frontmatter-end';

/**
 * Styles body `#tags` as pills (`cm-lp-tag`), by the indexer's rule
 * (`findInlineTags`). The mark covers `#` plus the name and hides nothing, so
 * it needs no reveal: the tag stays styled and editable under the cursor.
 *
 * Skips what the indexer strips: frontmatter, inline code and HTML comments
 * here, fenced code through the pipeline's block-context check. The tag name a
 * Cmd+click searches for is read back from the document in `click-handler.ts`.
 */
export const tagHandler: LineHandler = {
	name: 'tag',
	decorate({ line, state, decorations, scratch }) {
		const tags = findInlineTags(line.text);
		if (tags.length === 0) return;

		let frontmatterEnd = scratch.get(FRONTMATTER_END_KEY) as number | undefined;
		if (frontmatterEnd === undefined) {
			frontmatterEnd = frontmatterSlice(state.doc).length;
			scratch.set(FRONTMATTER_END_KEY, frontmatterEnd);
		}
		if (line.from < frontmatterEnd) return;

		const skipped: { from: number; to: number }[] = [];
		syntaxTree(state).iterate({
			from: line.from,
			to: line.to,
			enter: (node) => {
				if (SKIPPED_NODES.has(node.name)) skipped.push({ from: node.from, to: node.to });
			},
		});

		for (const tag of tags) {
			const from = line.from + tag.from;
			const to = line.from + tag.to;
			if (skipped.some((s) => from < s.to && to > s.from)) continue;
			decorations.push(tagDeco.range(from, to));
		}
	},
};
