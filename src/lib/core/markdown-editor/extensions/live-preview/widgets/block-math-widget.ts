import { WidgetType } from '@codemirror/view';
import katex from 'katex';
import DOMPurify from 'isomorphic-dompurify';

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

		try {
			const raw = katex.renderToString(this.formula, {
				throwOnError: false,
				displayMode: true,
			});
			container.innerHTML = DOMPurify.sanitize(raw);
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
