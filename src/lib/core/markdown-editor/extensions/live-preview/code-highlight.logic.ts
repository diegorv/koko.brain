import { createLowlight } from 'lowlight';
import { common } from 'lowlight';
import type { Root, Element, Text } from 'hast';

const lowlight = createLowlight(common);

/** Escapes HTML special characters to prevent injection */
function escapeHtml(text: string): string {
	return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Converts a HAST tree to an HTML string */
function hastToHtml(node: Root | Element | Text): string {
	if (node.type === 'text') return escapeHtml(node.value);
	if (node.type === 'element') {
		const classes = (node.properties?.className as string[] | undefined)?.join(' ') ?? '';
		const classAttr = classes ? ` class="${classes}"` : '';
		const children = (node.children ?? []).map((c) => hastToHtml(c as Element | Text)).join('');
		return `<${node.tagName}${classAttr}>${children}</${node.tagName}>`;
	}
	if (node.type === 'root') {
		return (node.children ?? []).map((c) => hastToHtml(c as Element | Text)).join('');
	}
	return '';
}

/** Result of syntax highlighting */
export interface HighlightResult {
	/** HTML string with highlight.js classes */
	html: string;
	/** Language used for highlighting */
	language: string;
}

/**
 * Highlights code using lowlight (highlight.js wrapper).
 * Returns an HTML string with `hljs-*` class spans.
 * Falls back to escaped plain text if the language is unknown.
 */
export function highlightCode(code: string, language?: string): HighlightResult {
	if (!code) return { html: '', language: language || 'text' };

	if (language && lowlight.registered(language)) {
		const result = lowlight.highlight(language, code);
		return { html: hastToHtml(result), language };
	}

	return { html: escapeHtml(code), language: language || 'text' };
}
