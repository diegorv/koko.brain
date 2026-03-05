// ---------------------------------------------------------------------------
// Composition-Aware Bracket Matching
// ---------------------------------------------------------------------------
//
// This file replaces CodeMirror's built-in `bracketMatching()` extension with
// a custom ViewPlugin that is safe to use during dead-key composition on WebKit
// (Safari / Tauri WKWebView on macOS).
//
// THE BUG
// -------
// When typing accented characters via dead-key composition (e.g., pressing `'`
// then `e` to produce `é`), text before a `(` visually disappears. The text is
// NOT lost — it remains in CodeMirror's document state and is visible in source
// mode — but it vanishes from the rendered DOM.
//
// Conditions to reproduce:
//   1. Must be inside a list item (`- ...`) or blockquote (`> ...`)
//   2. Must have a `(` somewhere before the cursor on the same line
//   3. Must use dead-key composition (any accent: é, á, ã, ñ, etc.)
//   4. Must be on WebKit (Safari, or Tauri/WKWebView on macOS)
//   5. Normal paragraphs and lines without `(` are NOT affected
//
// Example: typing `- estou testando. (isso é` — after the `é` resolves,
// everything before `(` vanishes from the DOM.
//
// ROOT CAUSE
// ----------
// CodeMirror's `bracketMatching()` uses a **StateField** that recalculates on
// every transaction. It wraps matching brackets in `<span class="cm-matchingBracket">`
// decoration nodes. Here's what happens during dead-key composition:
//
//   1. User presses `'` (dead key) → browser creates a temporary composing
//      text node in the DOM with the pending accent
//   2. CodeMirror detects the input and fires a transaction
//   3. `bracketMatching()` recalculates decorations — the `(` may gain or lose
//      its matching `<span>` wrapper depending on cursor position
//   4. This adds/removes `<span>` tags around the `(`, which **restructures the
//      DOM nodes** on that line — the text node where the browser was composing
//      the accent gets **destroyed and recreated**
//   5. WebKit (unlike Chromium) does NOT recover gracefully when the composing
//      text node is destroyed mid-composition — it loses its reference to the
//      composition, and the preceding text disappears from rendering
//
// The `(` requirement exists because `bracketMatching()` only creates decorations
// around bracket characters. No brackets on the line → no decoration changes →
// no DOM restructuring → no bug.
//
// List items and blockquotes are affected more because their DOM structure is
// more complex (nested spans for BulletList > ListItem > ListMark, etc.),
// making the decoration-triggered restructuring more disruptive to WebKit's
// composition tracking.
//
// WHY CODEMIRROR DOESN'T HANDLE THIS
// -----------------------------------
// CodeMirror has composition-awareness in its input handling layer, but the
// `bracketMatching()` StateField has no composition guard. StateFields run
// on every transaction unconditionally. There's no built-in mechanism to
// "pause" a StateField during composition.
//
// DIAGNOSIS PROCESS
// -----------------
// This was diagnosed using a custom debug extension (see `debug-composition.ts`
// in this same directory) that:
//   - Logged composition DOM events (compositionstart/update/end)
//   - Logged every CodeMirror transaction during composition
//   - Observed DOM mutations via MutationObserver during composition
//   - Exposed window.dbg.* toggle functions to disable extensions at runtime
//
// The MutationObserver logs revealed the smoking gun: during compositionstart,
// a `characterData` mutation showed the text node content changing from
// `" estou testando ("` to `" estou testando "` — the `(` was being extracted
// into a new `<span class="cm-matchingBracket">` node, destroying the text
// node the browser was using for composition.
//
// Disabling `bracketMatching()` via `dbg.bracketMatching()` immediately fixed
// the bug. Re-enabling it brought the bug back. No other extension contributed.
//
// FAILED APPROACH
// ---------------
// The first fix attempted used a Compartment to reconfigure `bracketMatching()`
// on/off during composition events (disable on compositionstart, re-enable on
// compositionend). This failed because dispatching a compartment reconfigure
// creates a CodeMirror transaction, which during compositionstart caused the
// cursor to jump to the beginning of the line — a different but equally broken
// behavior.
//
// THE FIX (this file)
// -------------------
// This ViewPlugin computes bracket-matching decorations using the same
// `matchBrackets()` API from `@codemirror/language` that the built-in
// `bracketMatching()` uses internally. The critical difference:
//
//   - When `view.composing` or `view.compositionStarted` is true, the plugin's
//     `update()` method returns early WITHOUT recalculating decorations
//   - The previous decorations are kept frozen in place — no DOM changes occur
//   - No transactions are dispatched — zero interference with composition
//   - After composition ends, decorations update normally on the next
//     docChanged or selectionSet event
//
// This is safe because bracket highlighting being slightly stale for the ~100ms
// duration of a dead-key composition is completely imperceptible to the user.
//
// ---------------------------------------------------------------------------

import { RangeSetBuilder } from '@codemirror/state';
import type { Extension } from '@codemirror/state';
import {
	Decoration,
	type DecorationSet,
	EditorView,
	ViewPlugin,
	type ViewUpdate,
} from '@codemirror/view';
import { matchBrackets } from '@codemirror/language';

const matchingDeco = Decoration.mark({ class: 'cm-matchingBracket' });
const nonmatchingDeco = Decoration.mark({ class: 'cm-nonmatchingBracket' });

/** Builds a DecorationSet with bracket-match highlights for all selection ranges. */
function buildBracketDecorations(view: EditorView): DecorationSet {
	const builder = new RangeSetBuilder<Decoration>();
	// Collect all decoration ranges first, then sort by position
	const ranges: { from: number; to: number; deco: Decoration }[] = [];

	for (const range of view.state.selection.ranges) {
		// Try matching backward first (cursor after bracket), then forward
		const match = matchBrackets(view.state, range.head, -1)
			?? matchBrackets(view.state, range.head, 1);
		if (!match) continue;

		const deco = match.matched ? matchingDeco : nonmatchingDeco;
		ranges.push({ from: match.start.from, to: match.start.to, deco });
		if (match.end) {
			ranges.push({ from: match.end.from, to: match.end.to, deco });
		}
	}

	// RangeSetBuilder requires ranges in strictly ascending order
	ranges.sort((a, b) => a.from - b.from || a.to - b.to);
	for (const r of ranges) {
		builder.add(r.from, r.to, r.deco);
	}
	return builder.finish();
}

/** Composition-aware bracket matching that replaces the built-in `bracketMatching()`. */
export function compositionAwareBracketMatching(): Extension {
	return [
		ViewPlugin.fromClass(
			class {
				decorations: DecorationSet;

				constructor(view: EditorView) {
					this.decorations = buildBracketDecorations(view);
				}

				update(update: ViewUpdate) {
					// Freeze decorations during composition to prevent DOM
					// restructuring that breaks WebKit's IME handling
					if (update.view.composing || update.view.compositionStarted) {
						return;
					}
					if (update.docChanged || update.selectionSet) {
						this.decorations = buildBracketDecorations(update.view);
					}
				}
			},
			{ decorations: (v) => v.decorations },
		),
		EditorView.baseTheme({
			'.cm-matchingBracket': { backgroundColor: 'var(--bracket-match-bg, #bad0f847)', color: 'var(--bracket-match-fg, inherit)' },
			'.cm-nonmatchingBracket': { backgroundColor: 'var(--bracket-nonmatch-bg, #ff000033)', color: 'var(--bracket-nonmatch-fg, inherit)' },
		}),
	];
}
