import { WidgetType } from '@codemirror/view';
import katex from 'katex';
import DOMPurify from 'isomorphic-dompurify';

/** Widget that renders an inline `$formula$` as a KaTeX-rendered span */
export class InlineMathWidget extends WidgetType {
	constructor(readonly formula: string) {
		super();
	}

	toDOM() {
		const span = document.createElement('span');
		span.className = 'cm-lp-math-inline';

		try {
			const raw = katex.renderToString(this.formula, {
				throwOnError: false,
				displayMode: false,
			});
			span.innerHTML = DOMPurify.sanitize(raw);
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
