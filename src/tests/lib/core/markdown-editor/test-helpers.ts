import { vi } from 'vitest';
import { EditorSelection, EditorState, type Extension } from '@codemirror/state';
import { markdown } from '@codemirror/lang-markdown';
import { ensureSyntaxTree } from '@codemirror/language';
import { GFM } from '@lezer/markdown';
import { MathExtension } from '$lib/core/markdown-editor/extensions/lezer/math-extension';
import { HighlightExtension } from '$lib/core/markdown-editor/extensions/lezer/highlight-extension';

/** Splits a multi-line string into line objects with text and absolute positions */
export function makeLines(text: string) {
	const result: { text: string; from: number; to: number }[] = [];
	let pos = 0;
	for (const lineText of text.split('\n')) {
		result.push({ text: lineText, from: pos, to: pos + lineText.length });
		pos += lineText.length + 1;
	}
	return result;
}

/**
 * Creates an EditorState with a fully parsed syntax tree, for parser and decorator tests
 * that need Lezer tree access. This is the only place in the test suite that builds such a
 * state; every local helper delegates here so the parse handling below lives in one spot.
 * @param doc Document text.
 * @param options.extensions Language extension set. Defaults to markdown + GFM + the custom
 *   math and highlight Lezer extensions.
 * @param options.cursor Cursor offset. Omitted means the default selection at position 0.
 */
export function createMarkdownState(
	doc: string,
	options: { extensions?: Extension[]; cursor?: number } = {},
): EditorState {
	const state = EditorState.create({
		doc,
		extensions: options.extensions ?? [
			markdown({ extensions: [GFM, MathExtension, HighlightExtension] }),
		],
		selection: options.cursor !== undefined ? EditorSelection.single(options.cursor) : undefined,
	});
	// Both calls below are required, and neither replaces the other. EditorState.create parses
	// under a hardcoded 20 ms budget (Work.Apply in LanguageState.init) and snapshots whatever
	// tree that produced; syntaxTree() only ever reads that snapshot. ensureSyntaxTree finishes
	// the parse on the mutable ParseContext but never writes the result back to the snapshot,
	// so the empty transaction is what makes LanguageState re-snapshot the finished tree.
	if (!ensureSyntaxTree(state, state.doc.length, 5000)) {
		// ParseContext.work returned false, so the tree is still truncated and the empty
		// transaction would only re-snapshot the truncation. Fail loudly instead of handing
		// back a short tree that surfaces as an unexplained missing decoration.
		throw new Error(
			`createMarkdownState: parse did not finish within 5000 ms (doc length ${state.doc.length})`,
		);
	}
	return state.update({}).state;
}

/**
 * Makes every `Date.now()` reading advance by `stepMs`, so the 20 ms budget CodeMirror
 * gives the initial parse (`Work.Apply` in `LanguageState.init`) is provably exhausted
 * instead of depending on machine load. `LanguageState.init` derives its deadline from
 * `Date.now() + 20`, and that derivation already consumes one reading, so the budget buys
 * roughly `20 / stepMs + 1` `advance()` calls. There is no flat safe/unsafe step: which
 * step truncates depends on how many blocks the fixture has, and a fixture of three or
 * more blocks already truncates at a 20 ms step. A 25 ms step leaves a single advance and
 * truncates every multi-block fixture used here, which is why all callers pass 25.
 * `vi.useFakeTimers()` is deliberately NOT an option: a frozen clock gives the parse an
 * unlimited budget, so the test would pass against a truncating helper and prove nothing.
 * Callers must restore the spy themselves (`vi.restoreAllMocks()`).
 * @param stepMs Milliseconds added to the clock per reading.
 */
export function stepDateNow(stepMs: number): void {
	let now = Date.now();
	vi.spyOn(Date, 'now').mockImplementation(() => {
		now += stepMs;
		return now;
	});
}
