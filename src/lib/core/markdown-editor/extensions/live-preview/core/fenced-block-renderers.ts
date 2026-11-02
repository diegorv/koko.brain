import { Facet } from '@codemirror/state';
import type { WidgetType } from '@codemirror/view';

/**
 * Renders one kind of fenced block (`` ```queryjs ``, `` ```collection ``) as a
 * widget. The editor's block field finds the block and hides its lines; the
 * renderer, registered by the feature or plugin that owns the block, builds
 * the widget. With no renderer for a language, the field adds no decoration
 * and the block shows as raw lines.
 *
 * The widget's `eq()` must compare the block content only, never a renderer
 * or host reference, and `toDOM()` must not hand one live node to two widgets
 * (CLAUDE.md Live Preview rule 2).
 */
export interface FencedBlockRenderer {
	/** The fence language this renderer owns, matched against the field's language (`queryjs`, `collection`). */
	language: string;
	/** Builds the widget for one block from the lines between its fences. */
	widget(source: string): WidgetType;
}

/**
 * The registered renderers by language. Static: the app installs them once
 * with `fencedBlockRenderers.of(renderer)` outside every compartment. When two
 * renderers claim one language, the first wins.
 */
export const fencedBlockRenderers = Facet.define<FencedBlockRenderer, ReadonlyMap<string, FencedBlockRenderer>>({
	static: true,
	combine: (values) => {
		const byLanguage = new Map<string, FencedBlockRenderer>();
		for (const renderer of values) {
			if (!byLanguage.has(renderer.language)) byLanguage.set(renderer.language, renderer);
		}
		return byLanguage;
	},
});
