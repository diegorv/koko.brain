import type { EditorState, StateEffectType } from '@codemirror/state';
import {
	type DecorationSet,
	EditorView,
	type PluginValue,
	ViewPlugin,
	type ViewUpdate,
} from '@codemirror/view';
import { checkUpdateAction } from './check-update-action';
import { profileStart, profileEnd } from './profiling';

/** Runtime value every block decorator ViewPlugin exposes. */
export interface BlockDecoratorValue extends PluginValue {
	/** Decorations currently provided to the view */
	decorations: DecorationSet;
	/** Line number the cursor was on at the last rebuild (perf rule 5) */
	lastCursorLine: number;
}

/** Describes one block decorator: its identity, its scan, and its update gates. */
export interface BlockDecoratorSpec {
	/**
	 * Troubleshooting kill-switch name. Persisted user data (`settings.json`
	 * `disabledDecorators`) — renaming one orphans everyone's saved toggle.
	 * Deliberately separate from `profileLabel`, which the two diverge from
	 * (`queryjs` vs `queryjs-block`, `codeBlock` vs `code-block`).
	 */
	settingsKey: string;
	/** `LP-PROFILE` / `LP-TRACE` label for this decorator's rebuilds */
	profileLabel: string;
	/** Full-document decoration scan */
	compute: (state: EditorState) => DecorationSet;
	/**
	 * Extra effects that force a rebuild. `checkUpdateAction` returns `'none'`
	 * for an effect-only transaction, so a decorator whose output depends on
	 * custom state (callout fold) must name the effect that changes it.
	 */
	rebuildOn?: readonly StateEffectType<unknown>[];
	/**
	 * Optional narrower gate, evaluated after the viewport guard: return
	 * `false` to skip the update entirely. Used by queryjs, whose widgets are
	 * expensive enough that it ignores everything but doc edits, selection
	 * changes and `forceDecorationRebuild`.
	 */
	gate?: (update: ViewUpdate) => boolean;
}

/**
 * Builds a block decorator ViewPlugin: one full-document scan plus the update
 * discipline every block decorator shares (CLAUDE.md live-preview perf rules
 * 4 and 5) — viewport-only scroll never rebuilds, and `checkUpdateAction`
 * reads `lastCursorLine` so cursor moves within one line are no-ops.
 */
export function blockDecorator(spec: BlockDecoratorSpec): ViewPlugin<BlockDecoratorValue> {
	const { profileLabel, compute, rebuildOn, gate } = spec;

	return ViewPlugin.fromClass(
		class implements BlockDecoratorValue {
			decorations: DecorationSet;
			lastCursorLine: number;

			constructor(view: EditorView) {
				this.decorations = compute(view.state);
				this.lastCursorLine = view.state.doc.lineAt(view.state.selection.main.head).number;
			}

			update(update: ViewUpdate) {
				// Perf rule 4: pure scroll defers to scrollDebouncePlugin.
				if (update.viewportChanged && !update.docChanged && !update.selectionSet) return;
				if (gate && !gate(update)) return;

				const forced =
					rebuildOn !== undefined &&
					update.transactions.some((t) =>
						t.effects.some((e) => rebuildOn.some((type) => e.is(type))),
					);

				// Perf rule 5: checkUpdateAction with lastCursorLine.
				if (forced || checkUpdateAction(update, this.lastCursorLine) === 'rebuild') {
					this.lastCursorLine = update.state.doc.lineAt(update.state.selection.main.head).number;
					const _t = profileStart(profileLabel);
					this.decorations = compute(update.state);
					profileEnd(profileLabel, _t);
				}
			}
		},
		{ decorations: (v) => v.decorations },
	);
}
