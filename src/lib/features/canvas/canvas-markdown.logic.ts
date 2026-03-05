import { Marked } from 'marked';
import { sanitizeHtml } from '$lib/utils/sanitize';

const marked = new Marked({
	gfm: true,
	breaks: true,
});

/**
 * Renders markdown text to sanitized HTML for canvas card display.
 * Strips scripts, event handlers, and other XSS vectors.
 * Returns empty string for empty/null input.
 */
export function renderCanvasMarkdown(text: string | undefined | null): string {
	if (!text) return '';
	const html = marked.parse(text, { async: false }) as string;
	return sanitizeHtml(html);
}
