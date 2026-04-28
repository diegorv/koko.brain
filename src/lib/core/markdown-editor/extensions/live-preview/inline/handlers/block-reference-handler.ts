import { Decoration } from '@codemirror/view';
import { findBlockReference } from '../../parsers/block-reference';
import type { LineHandler } from '../inline-formatting-plugin';

/**
 * Hides block-reference suffixes (` ^block-id`) at end-of-line. No Lezer node
 * for this Obsidian-specific syntax — line handler reusing
 * `findBlockReference` from `parsers/block-reference.ts`.
 *
 * Per-line cursor reveal:
 *   - cursor outside the line → `cm-lp-block-ref cm-lp-block-ref-hidden`
 *     (display: none)
 *   - cursor on the line → `cm-lp-block-ref` only (dimmed but visible)
 */
export const blockReferenceHandler: LineHandler = {
	name: 'block-reference',
	decorate({ line, isTouched, decorations }) {
		const ref = findBlockReference(line.text, line.from);
		if (!ref) return;
		const cls = isTouched(line.from, line.to)
			? 'cm-lp-block-ref'
			: 'cm-lp-block-ref cm-lp-block-ref-hidden';
		decorations.push(Decoration.mark({ class: cls }).range(ref.from, ref.to));
	},
};
