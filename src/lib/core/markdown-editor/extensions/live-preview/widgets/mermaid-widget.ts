import { WidgetType } from '@codemirror/view';
import { sanitizeMermaidSvg } from '$lib/utils/sanitize';

/** Whether mermaid has been initialized */
let initialized = false;

/** Cached mermaid module reference */
let mermaidInstance: typeof import('mermaid').default | null = null;

/** Lazily imports and initializes mermaid (idempotent) */
async function getMermaid(): Promise<typeof import('mermaid').default> {
	if (mermaidInstance && initialized) return mermaidInstance;
	const { default: mermaid } = await import('mermaid');
	mermaidInstance = mermaid;
	if (!initialized) {
		mermaid.initialize({
			startOnLoad: false,
			theme: 'dark',
			securityLevel: 'strict',
			fontFamily: 'inherit',
		});
		initialized = true;
	}
	return mermaid;
}

/** Counter to generate unique IDs for each mermaid render */
let renderCounter = 0;

/**
 * Widget that renders a ```mermaid fenced code block as an inline SVG diagram.
 * Uses mermaid.render() with async rendering and shows an error message for invalid syntax.
 */
export class MermaidWidget extends WidgetType {
	constructor(readonly source: string) {
		super();
	}

	toDOM() {
		const container = document.createElement('div');
		container.className = 'cm-lp-mermaid';

		// Header
		const header = document.createElement('div');
		header.className = 'cm-lp-mermaid-header';

		const label = document.createElement('span');
		label.className = 'cm-lp-mermaid-lang';
		label.textContent = 'mermaid';
		header.appendChild(label);

		container.appendChild(header);

		// Diagram container
		const diagramEl = document.createElement('div');
		diagramEl.className = 'cm-lp-mermaid-diagram';
		container.appendChild(diagramEl);

		if (!this.source.trim()) {
			diagramEl.className = 'cm-lp-mermaid-error';
			diagramEl.textContent = 'Empty mermaid diagram';
			return container;
		}

		// Validate with parse() first to avoid mermaid injecting error elements into the body,
		// then render only if valid
		const id = `mermaid-${Date.now()}-${renderCounter++}`;
		(async () => {
			try {
				const mermaid = await getMermaid();
				await mermaid.parse(this.source);
				const result = await mermaid.render(id, this.source);
				// Sanitize before inserting to strip any scripts/event handlers from mermaid output
				diagramEl.innerHTML = sanitizeMermaidSvg(result.svg);
				const svg = diagramEl.querySelector('svg');
				if (svg) svg.removeAttribute('id');
			} catch (err: unknown) {
				diagramEl.className = 'cm-lp-mermaid-error';
				const message = err instanceof Error ? err.message : String(err);
				diagramEl.textContent = `Mermaid error: ${message}`;
			} finally {
				// Clean up any orphaned temp elements mermaid may have left in the body
				for (const elId of [id, `d${id}`]) {
					const el = document.getElementById(elId);
					if (el) el.remove();
				}
			}
		})();

		return container;
	}

	eq(other: MermaidWidget) {
		return this.source === other.source;
	}

	ignoreEvent() {
		return true;
	}
}
