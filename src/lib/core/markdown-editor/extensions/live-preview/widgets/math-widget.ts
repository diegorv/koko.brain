import { WidgetType } from '@codemirror/view';
import katex from 'katex';
import DOMPurify from 'dompurify';

/** Render cache: `<mode>:<formula>` -> sanitized KaTeX HTML. Skips the expensive
 *  katex.renderToString + DOMPurify pass across viewport cycles. Stores HTML
 *  strings (never live elements) so two widgets for a duplicated formula can
 *  never share a DOM node — CodeMirror builds new lines detached, and a shared
 *  node would be moved to the last widget, blanking the earlier occurrences. */
const mathCache = new Map<string, string>();

/** Drops all cached renders. Called during vault teardown. */
export function clearMathCache(): void {
	mathCache.clear();
}

/** Widget that renders a math formula with KaTeX: `$$...$$` blocks as a
 *  centered display `<div>`, inline `$...$` as a `<span>`. */
export class MathWidget extends WidgetType {
	/**
	 * @param formula Raw LaTeX source (delimiters already stripped).
	 * @param displayMode `true` for `$$...$$` blocks, `false` for inline `$...$`.
	 */
	constructor(
		readonly formula: string,
		readonly displayMode: boolean,
	) {
		super();
	}

	toDOM() {
		const container = document.createElement(this.displayMode ? 'div' : 'span');
		container.className = this.displayMode ? 'cm-lp-math-block' : 'cm-lp-math-inline';

		// Block-only guard: `$$\n\n$$` hides its source lines, so an empty KaTeX
		// render would leave nothing visible at all. Inline `$$` keeps rendering
		// through KaTeX, which is what it did before the widgets were merged.
		if (this.displayMode && !this.formula.trim()) {
			container.className = 'cm-lp-math-error';
			container.textContent = 'Empty math expression';
			return container;
		}

		// The key MUST carry displayMode: KaTeX emits different markup per mode
		// (display wraps the render in `.katex-display`), so a formula-only key
		// would serve the block render to an inline site and vice versa.
		const key = `${this.displayMode ? 'block' : 'inline'}:${this.formula}`;
		const cached = mathCache.get(key);
		if (cached !== undefined) {
			container.innerHTML = cached;
			return container;
		}

		try {
			const raw = katex.renderToString(this.formula, {
				throwOnError: false,
				displayMode: this.displayMode,
			});
			const html = DOMPurify.sanitize(raw);
			container.innerHTML = html;
			mathCache.set(key, html);
		} catch {
			container.className = 'cm-lp-math-error';
			container.textContent = this.formula;
		}

		return container;
	}

	eq(other: MathWidget) {
		return this.formula === other.formula && this.displayMode === other.displayMode;
	}

	ignoreEvent() {
		return true;
	}
}
