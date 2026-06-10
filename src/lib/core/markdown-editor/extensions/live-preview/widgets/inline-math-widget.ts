import { WidgetType } from '@codemirror/view';
import katex from 'katex';
import DOMPurify from 'dompurify';

/** Render cache: formula text -> sanitized KaTeX HTML. Skips the expensive
 *  katex.renderToString + DOMPurify pass across viewport cycles. Stores HTML
 *  strings (never live elements) so two widgets for a duplicated formula can
 *  never share a DOM node — CodeMirror builds new lines detached, and a shared
 *  node would be moved to the last widget, blanking the earlier occurrences. */
const inlineMathCache = new Map<string, string>();

/** Drops all cached inline-math renders. Called during vault teardown. */
export function clearInlineMathCache(): void {
	inlineMathCache.clear();
}

/** Widget that renders an inline `$formula$` as a KaTeX-rendered span */
export class InlineMathWidget extends WidgetType {
	constructor(readonly formula: string) {
		super();
	}

	toDOM() {
		const span = document.createElement('span');
		span.className = 'cm-lp-math-inline';

		const cached = inlineMathCache.get(this.formula);
		if (cached !== undefined) {
			span.innerHTML = cached;
			return span;
		}

		try {
			const raw = katex.renderToString(this.formula, {
				throwOnError: false,
				displayMode: false,
			});
			const html = DOMPurify.sanitize(raw);
			span.innerHTML = html;
			inlineMathCache.set(this.formula, html);
		} catch {
			span.className = 'cm-lp-math-error';
			span.textContent = this.formula;
		}

		return span;
	}

	eq(other: InlineMathWidget) {
		return this.formula === other.formula;
	}

	ignoreEvent() {
		return true;
	}
}
