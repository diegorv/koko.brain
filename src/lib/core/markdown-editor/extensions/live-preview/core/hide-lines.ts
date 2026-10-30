import type { RangeSetBuilder, Text } from '@codemirror/state';
import { Decoration } from '@codemirror/view';
import { hiddenLineDeco } from '../styles';

/**
 * Collapses lines `firstLine` to `lastLine` (1-based, inclusive; nothing when
 * `firstLine > lastLine`): the line class removes the line element and the
 * replace removes its text. Block decorators use it for every line of a
 * block after the one their widget replaces.
 *
 * Takes a builder, not a `Range[]` for `Decoration.set`: an empty line gets
 * an empty replace, which `Decoration.range()` rejects and the builder accepts.
 */
export function hideLines(builder: RangeSetBuilder<Decoration>, doc: Text, firstLine: number, lastLine: number): void {
	for (let n = firstLine; n <= lastLine; n++) {
		const line = doc.line(n);
		builder.add(line.from, line.from, hiddenLineDeco);
		builder.add(line.from, line.to, Decoration.replace({}));
	}
}
