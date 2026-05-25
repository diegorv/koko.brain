import { WidgetType } from '@codemirror/view';
import katex from 'katex';
import DOMPurify from 'dompurify';

/** Live-DOM cache: formula text -> rendered container. Survives widget destruction across viewport cycles. */
const mathCache = new Map<string, HTMLElement>();

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
		const cached = mathCache.get(this.formula);
		if (cached && !cached.isConnected) return cached;

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
			mathCache.set(this.formula, container);
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
