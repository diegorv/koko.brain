import { headingLineDeco, hiddenSyntaxDeco, revealedBlockSyntaxDeco } from '../../styles';
import type { NodeHandler } from '../inline-formatting-plugin';

/**
 * Builds an ATX heading handler (`# … ######`). Emits:
 *   - `Decoration.line({ class: 'cm-lp-h{N}' })` for line-level styling
 *     (font size, weight, colour) — uses the shared `headingLineDeco`
 *     constant so there's one source of truth for the class string.
 *   - over the `HeaderMark` (`#…` plus the trailing space): `hiddenSyntaxDeco`
 *     when the cursor is away from the line, `revealedBlockSyntaxDeco` (dim)
 *     when it is on it. The swap is instant (ADR 0008).
 */
function makeATXHandler(level: number): NodeHandler {
	return {
		nodeType: `ATXHeading${level}`,
		decorate({ node, state, isRevealed, decorations }) {
			const line = state.doc.lineAt(node.from);
			decorations.push(headingLineDeco[level].range(line.from, line.from));

			const headerMark = node.node.getChild('HeaderMark');
			if (!headerMark) return;
			// Include the space after `#` so the entire prefix collapses together
			const markTo = Math.min(headerMark.to + 1, line.to);
			const deco = isRevealed(line.from, line.to) ? revealedBlockSyntaxDeco : hiddenSyntaxDeco;
			decorations.push(deco.range(headerMark.from, markTo));
		},
	};
}

/**
 * Builds a setext heading handler (`Heading\n=====` for level 1,
 * `Heading\n-----` for level 2). The text line gets `cm-lp-h{N}` for
 * styling; the underline row is hidden via `hiddenSyntaxDeco` and only
 * revealed when the cursor enters the heading (text or underline).
 */
function makeSetextHandler(level: 1 | 2): NodeHandler {
	return {
		nodeType: `SetextHeading${level}`,
		decorate({ node, state, isRevealed, decorations }) {
			const textLine = state.doc.lineAt(node.from);
			const underlineLine = state.doc.lineAt(node.to);
			decorations.push(headingLineDeco[level].range(textLine.from, textLine.from));

			const deco = isRevealed(node.from, node.to) ? revealedBlockSyntaxDeco : hiddenSyntaxDeco;
			decorations.push(deco.range(underlineLine.from, underlineLine.to));
		},
	};
}

/**
 * 8 node handlers covering every heading variant the legacy `headingPlugin`
 * supported: 6 ATX levels + 2 setext levels.
 */
export const headingHandlers: readonly NodeHandler[] = [
	makeATXHandler(1),
	makeATXHandler(2),
	makeATXHandler(3),
	makeATXHandler(4),
	makeATXHandler(5),
	makeATXHandler(6),
	makeSetextHandler(1),
	makeSetextHandler(2),
];
