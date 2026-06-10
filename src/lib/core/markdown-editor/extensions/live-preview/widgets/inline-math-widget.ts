import { WidgetType } from '@codemirror/view';
import katex from 'katex';
import DOMPurify from 'dompurify';

/** Live-DOM cache: formula text -> rendered span. Survives widget destruction across viewport cycles. */
const inlineMathCache = new Map<string, HTMLElement>();

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
		const cached = inlineMathCache.get(this.formula);
		if (cached && !cached.isConnected) return cached;

		const span = document.createElement('span');
		span.className = 'cm-lp-math-inline';

		try {
			const raw = katex.renderToString(this.formula, {
				throwOnError: false,
				displayMode: false,
			});
			span.innerHTML = DOMPurify.sanitize(raw);
			inlineMathCache.set(this.formula, span);
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
