import { WidgetType } from '@codemirror/view';
import { isDarkColor } from '#lib/utils/color.js';
import { sanitizeMermaidSvg } from '#lib/utils/sanitize.js';

/** Mermaid's built-in themes used for light and dark editor backgrounds */
type MermaidTheme = 'default' | 'dark';

/** Mermaid theme of the current initialization, null before the first one */
let initializedTheme: MermaidTheme | null = null;

/** Cached mermaid module reference */
let mermaidInstance: typeof import('mermaid').default | null = null;

/** Picks the mermaid theme from the active theme's editor background; dark when it cannot be read. */
function currentMermaidTheme(): MermaidTheme {
	const editorBg = getComputedStyle(document.documentElement).getPropertyValue('--editor-bg');
	return isDarkColor(editorBg) === false ? 'default' : 'dark';
}

/** Lazily imports mermaid and (re)initializes it whenever the theme changes */
async function getMermaid(theme: MermaidTheme): Promise<typeof import('mermaid').default> {
	if (!mermaidInstance) {
		const { default: mermaid } = await import('mermaid');
		mermaidInstance = mermaid;
	}
	if (initializedTheme !== theme) {
		mermaidInstance.initialize({
			startOnLoad: false,
			theme,
			securityLevel: 'strict',
			fontFamily: 'inherit',
		});
		initializedTheme = theme;
	}
	return mermaidInstance;
}

/** Counter to generate unique IDs for each mermaid render */
let renderCounter = 0;

/** Render cache: mermaid theme + source text -> sanitized SVG markup (render id already
 *  stripped). Skips the expensive mermaid parse + render + sanitize pass
 *  across viewport cycles. Stores markup strings (never live elements) so two
 *  widgets for a duplicated diagram can never share a DOM node — CodeMirror
 *  builds new lines detached, and a shared node would be moved to the last
 *  widget, blanking the earlier occurrences. */
const mermaidCache = new Map<string, string>();

/** Drops all cached renders. Called during vault teardown. */
export function clearMermaidCache(): void {
	mermaidCache.clear();
}

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

		const theme = currentMermaidTheme();
		const cacheKey = `${theme}\n${this.source}`;
		const cachedSvg = mermaidCache.get(cacheKey);
		if (cachedSvg !== undefined) {
			diagramEl.innerHTML = cachedSvg;
			return container;
		}

		// Validate with parse() first to avoid mermaid injecting error elements into the body,
		// then render only if valid
		const id = `mermaid-${Date.now()}-${renderCounter++}`;
		const source = this.source;
		(async () => {
			try {
				const mermaid = await getMermaid(theme);
				await mermaid.parse(source);
				const result = await mermaid.render(id, source);
				// Sanitize before inserting to strip any scripts/event handlers from mermaid output
				diagramEl.innerHTML = sanitizeMermaidSvg(result.svg);
				const svg = diagramEl.querySelector('svg');
				if (svg) svg.removeAttribute('id');
				// Cache AFTER the id strip so cached copies carry no duplicate ids. Skip it when
				// another widget re-initialized mermaid with another theme mid-render.
				if (initializedTheme === theme) mermaidCache.set(cacheKey, diagramEl.innerHTML);
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
