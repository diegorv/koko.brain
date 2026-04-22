import { Decoration } from '@codemirror/view';
import type { EditorState } from '@codemirror/state';
import type { Text } from '@codemirror/state';

import { findMetaBindInputRanges } from '../../parsers/meta-bind-input';
import { MetaBindSelectWidget } from '../../widgets/meta-bind-select-widget';
import { MetaBindNumberWidget } from '../../widgets/meta-bind-number-widget';
import { parseFrontmatterProperties } from '$lib/features/properties/properties.logic';
import type { Property } from '$lib/features/properties/properties.types';
import type { InlineLineHandler, InlineDecorationEntry } from '../inline-formatting-plugin';

/**
 * Cache: a single rebuild walks every visible line, each potentially needing
 * the frontmatter properties. Parsing on every line would be 30+ reparses
 * per rebuild. Keyed on the immutable `Text` doc reference so the GC can
 * drop the entry when the doc is replaced.
 */
const frontmatterCache = new WeakMap<Text, Property[]>();

function getFrontmatter(state: EditorState): Property[] {
	const cached = frontmatterCache.get(state.doc);
	if (cached) return cached;
	const props = parseFrontmatterProperties(state.doc.toString());
	frontmatterCache.set(state.doc, props);
	return props;
}

/**
 * Replaces `` `INPUT[type(...):bindTarget]` `` with the right interactive
 * widget for the `type`. Currently recognizes `number` (numeric input with
 * inline validation); anything else falls back to `MetaBindSelectWidget`.
 */
export const metaBindInputHandler: InlineLineHandler = {
	decorate: ({ state, line, isTouched }) => {
		const entries: InlineDecorationEntry[] = [];
		const ranges = findMetaBindInputRanges(
			state.doc.sliceString(line.from, line.to),
			line.from,
		);
		if (ranges.length === 0) return entries;

		const properties = getFrontmatter(state);
		for (const range of ranges) {
			if (isTouched(range.from, range.to)) continue;

			const prop = properties.find((p) => p.key === range.bindTarget);
			const currentValue = prop ? String(prop.value) : null;

			const widget =
				range.inputType === 'number'
					? new MetaBindNumberWidget(range.bindTarget, currentValue)
					: new MetaBindSelectWidget(range.options, range.bindTarget, currentValue);

			entries.push({
				from: range.from,
				to: range.to,
				deco: Decoration.replace({ widget }),
			});
		}
		return entries;
	},
};
