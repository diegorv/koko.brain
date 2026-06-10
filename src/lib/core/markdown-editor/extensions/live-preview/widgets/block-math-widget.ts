import { WidgetType } from '@codemirror/view';
import katex from 'katex';
import DOMPurify from 'dompurify';

/** Render cache: formula text -> sanitized KaTeX HTML. Skips the expensive
 *  katex.renderToString + DOMPurify pass across viewport cycles. Stores HTML
 *  strings (never live elements) so two widgets for a duplicated formula can
 *  never share a DOM node — CodeMirror builds new lines detached, and a shared
 *  node would be moved to the last widget, blanking the earlier occurrences. */
const mathCache = new Map<string, string>();

/** Drops all cached renders. Called during vault teardown. */
export function clearMathCache(): void {
	mathCache.clear();
}

/** Widget that renders a `$$...$$` block math expression as a centered KaTeX display */
export class BlockMathWidget extends WidgetType {
	constructor(readonly formula: string) {
		super();
	}

	toDOM() {
		const container = document.createElement('div');
		container.className = 'cm-lp-math-block';

		if (!this.formula.trim()) {
			container.className = 'cm-lp-math-error';
			container.textContent = 'Empty math expression';
			return container;
		}

		const cached = mathCache.get(this.formula);
		if (cached !== undefined) {
			container.innerHTML = cached;
			return container;
		}

		try {
			const raw = katex.renderToString(this.formula, {
				throwOnError: false,
				displayMode: true,
			});
			const html = DOMPurify.sanitize(raw);
			container.innerHTML = html;
			mathCache.set(this.formula, html);
		} catch {
			container.className = 'cm-lp-math-error';
			container.textContent = this.formula;
		}

		return container;
	}

	eq(other: BlockMathWidget) {
		return this.formula === other.formula;
	}

	ignoreEvent() {
		return true;
	}
}
