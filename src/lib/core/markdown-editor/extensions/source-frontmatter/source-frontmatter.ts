import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';
import type { EditorState, Extension } from '@codemirror/state';
import { FRONTMATTER_FENCE_RE, findFrontmatterBlock } from '../live-preview/parsers/frontmatter';
import { getAllLines } from '../live-preview/core/get-all-lines';

const frontmatterLineDeco = Decoration.line({ class: 'cm-source-frontmatter' });

/**
 * Line decorations for the frontmatter block, opening and closing fences included.
 * Empty when line 1 is not a fence or the fence is never closed.
 */
export function buildSourceFrontmatterDecorations(state: EditorState): DecorationSet {
	const doc = state.doc;
	// Most notes fail here, so they never pay for the full line array.
	if (doc.lines < 2 || !FRONTMATTER_FENCE_RE.test(doc.line(1).text)) return Decoration.none;

	const lines = getAllLines(state);
	const block = findFrontmatterBlock(lines);
	if (!block) return Decoration.none;

	const builder = new RangeSetBuilder<Decoration>();
	for (let i = block.openIdx; i <= block.closeIdx; i++) {
		builder.add(lines[i].from, lines[i].from, frontmatterLineDeco);
	}
	return builder.finish();
}

/**
 * Source-mode frontmatter decoration. The block's range depends on the doc
 * alone, so it rebuilds only on a doc change, never on scroll or selection.
 */
export const sourceFrontmatterPlugin = ViewPlugin.fromClass(
	class {
		/** The frontmatter line decorations for the current doc */
		decorations: DecorationSet;
		constructor(view: EditorView) {
			this.decorations = buildSourceFrontmatterDecorations(view.state);
		}
		update(update: ViewUpdate) {
			if (update.docChanged) {
				this.decorations = buildSourceFrontmatterDecorations(update.state);
			}
		}
	},
	{ decorations: (v) => v.decorations },
);

/**
 * Draws the frontmatter as metadata. The closing `---` turns the YAML above it
 * into a setext H2, so `sourceHeadingSize` and `markdownHighlight` style the
 * spans as a heading. A base theme rule is scoped under the editor's base
 * theme class, so `<base> .cm-source-frontmatter span` is more specific than
 * their single highlight class and wins on the span without `!important`.
 */
export const sourceFrontmatterStyles = EditorView.baseTheme({
	'.cm-source-frontmatter, .cm-source-frontmatter span': {
		fontSize: 'inherit',
		fontWeight: 'normal',
		color: 'var(--syntax-meta)',
	},
});

/** Source-mode-only extension that draws the frontmatter block at body size in the meta colour */
export function sourceFrontmatter(): Extension {
	return [sourceFrontmatterPlugin, sourceFrontmatterStyles];
}
