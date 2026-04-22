import type { EditorState, StateEffectType } from '@codemirror/state';
import {
	type DecorationSet,
	EditorView,
	ViewPlugin,
	type ViewUpdate,
} from '@codemirror/view';

import { checkUpdateAction } from './check-update-action';
import { profileStart, profileEnd } from './profiling';

/**
 * Options for building a block-level ViewPlugin. `compute` is the only
 * plugin-specific piece; everything else is the shared scaffolding the
 * live preview's block fields used to repeat verbatim.
 */
export interface BlockFieldOptions {
	/** Profiling label passed to `profileEnd('<name>', …)`. */
	name: string;
	/** Rebuilds the decoration set from the editor state. */
	compute: (state: EditorState) => DecorationSet;
	/**
	 * Extra StateEffect types that should force a rebuild even when
	 * checkUpdateAction would otherwise return `'none'`. Used by callout-field
	 * to re-decorate when `toggleCalloutFold` fires without any doc/selection
	 * change.
	 */
	rebuildOnEffects?: readonly StateEffectType<unknown>[];
}

/**
 * Builds a ViewPlugin for a block-level decoration scanner. Consolidates the
 * ~25 lines of boilerplate (constructor / update / checkUpdateAction /
 * lastCursorLine tracking / viewport short-circuit / profiling) that nine
 * block fields used to carry verbatim.
 *
 * Callers supply the shape-specific `compute(state)` and an optional list of
 * effects that should trigger a rebuild outside the standard rules.
 */
export function buildBlockField({
	name,
	compute,
	rebuildOnEffects,
}: BlockFieldOptions) {
	return ViewPlugin.fromClass(
		class {
			decorations: DecorationSet;
			lastCursorLine: number;

			constructor(view: EditorView) {
				this.decorations = compute(view.state);
				this.lastCursorLine = view.state.doc.lineAt(view.state.selection.main.head).number;
			}

			update(update: ViewUpdate) {
				if (update.viewportChanged && !update.docChanged && !update.selectionSet) return;

				if (checkUpdateAction(update, this.lastCursorLine) === 'rebuild') {
					this.lastCursorLine = update.state.doc.lineAt(update.state.selection.main.head).number;
					const _t = profileStart();
					this.decorations = compute(update.state);
					profileEnd(name, _t);
					return;
				}

				if (rebuildOnEffects && rebuildOnEffects.length > 0) {
					for (const tr of update.transactions) {
						for (const effect of tr.effects) {
							if (rebuildOnEffects.some((type) => effect.is(type))) {
								this.decorations = compute(update.state);
								return;
							}
						}
					}
				}
			}
		},
		{ decorations: (v) => v.decorations },
	);
}
