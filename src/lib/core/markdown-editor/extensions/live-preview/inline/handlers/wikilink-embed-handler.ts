import { Decoration } from '@codemirror/view';

import { findWikilinkEmbedRanges } from '../../parsers/wikilink-embed';
import { WikilinkImageEmbedWidget } from '../../widgets/wikilink-image-embed-widget';
import { WikilinkNoteEmbedWidget } from '../../widgets/wikilink-note-embed-widget';
import type { InlineLineHandler, InlineDecorationEntry } from '../inline-formatting-plugin';

/** Parses the display/pipe value as an optional pixel width (e.g. `"300"` → `300`). */
function parseWidth(display: string | null): number | null {
	if (display === null) return null;
	const n = Number(display);
	return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Replaces `![[image.png]]` / `![[image.png|300]]` with `WikilinkImageEmbedWidget`
 * and `![[note]]` / `![[note#heading]]` / `![[note#^block]]` with
 * `WikilinkNoteEmbedWidget`. Skips when cursor overlaps the embed.
 */
export const wikilinkEmbedHandler: InlineLineHandler = {
	decorate: ({ state, line, isTouched }) => {
		const entries: InlineDecorationEntry[] = [];
		for (const range of findWikilinkEmbedRanges(state.doc.sliceString(line.from, line.to), line.from)) {
			if (isTouched(range.fullFrom, range.fullTo)) continue;

			if (range.type === 'image') {
				const width = parseWidth(range.display);
				entries.push({
					from: range.fullFrom,
					to: range.fullTo,
					deco: Decoration.replace({ widget: new WikilinkImageEmbedWidget(range.target, width) }),
				});
			} else {
				entries.push({
					from: range.fullFrom,
					to: range.fullTo,
					deco: Decoration.replace({
						widget: new WikilinkNoteEmbedWidget(range.target, range.heading, range.blockId),
					}),
				});
			}
		}
		return entries;
	},
};
