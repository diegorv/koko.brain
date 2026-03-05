import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitizes arbitrary HTML allowing a safe rich-text subset.
 * Use for user-controlled markdown rendered to HTML (canvas, preview, etc.).
 */
export function sanitizeHtml(html: string): string {
	return DOMPurify.sanitize(html, {
		ALLOWED_TAGS: [
			'p', 'br', 'hr',
			'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
			'ul', 'ol', 'li',
			'blockquote', 'pre', 'code',
			'strong', 'em', 'b', 'i', 'u', 's', 'del', 'ins',
			'a', 'img', 'audio', 'video', 'source',
			'table', 'thead', 'tbody', 'tr', 'th', 'td',
			'span', 'div',
			'mark', 'sup', 'sub',
		],
		ALLOWED_ATTR: [
			'href', 'src', 'alt', 'title', 'class', 'style',
			'target', 'rel',
			'colspan', 'rowspan',
			'width', 'height',
			'controls', 'preload', 'loop', 'autoplay', 'muted', 'type', 'poster',
		],
		ALLOW_DATA_ATTR: false,
		FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input'],
		FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur'],
	});
}

/**
 * Sanitizes SVG inner content (paths, circles, etc.) for use inside a trusted <svg> element.
 * Wraps the content in an <svg> so DOMPurify parses it in SVG context, then returns the inner HTML.
 * Only allows SVG shape/presentation elements — no scripts, no event handlers, no foreignObject.
 */
export function sanitizeSvgContent(svgInner: string): string {
	// Wrap in <svg> so DOMPurify parses child elements in the correct SVG namespace
	const wrapped = `<svg xmlns="http://www.w3.org/2000/svg">${svgInner}</svg>`;
	const clean = DOMPurify.sanitize(wrapped, {
		USE_PROFILES: { svg: true, svgFilters: true },
		FORBID_TAGS: ['script', 'foreignObject', 'use'],
		FORBID_ATTR: [
			'onload', 'onerror', 'onclick', 'onmouseover', 'onfocus', 'onblur',
			'xlink:href', 'href',
		],
	});
	// Strip the outer <svg>...</svg> wrapper to return only inner content
	return clean.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
}

/**
 * Sanitizes KaTeX/math HTML output. Allows the specific subset of HTML that
 * KaTeX generates (spans with class attributes, MathML-like structure).
 */
export function sanitizeMathHtml(html: string): string {
	return DOMPurify.sanitize(html, {
		ALLOWED_TAGS: [
			'span', 'div',
			'math', 'mi', 'mo', 'mn', 'ms', 'mtext', 'mspace',
			'msub', 'msup', 'msubsup', 'munder', 'mover', 'munderover',
			'mrow', 'mfrac', 'msqrt', 'mroot', 'mfenced', 'mpadded',
			'mtable', 'mtr', 'mtd', 'mlabeledtr',
			'mstyle', 'merror', 'mphantom', 'maction',
			'annotation', 'semantics',
			'svg', 'path', 'rect', 'line', 'circle', 'ellipse', 'polygon',
		],
		ALLOWED_ATTR: ['class', 'style', 'aria-hidden', 'viewBox', 'd', 'xmlns', 'width', 'height'],
		ALLOW_DATA_ATTR: false,
	});
}

/**
 * Sanitizes an FTS5 snippet string that may contain <mark> tags.
 * All other HTML is escaped. This is a strict whitelist: only <mark> is preserved.
 */
export function sanitizeSnippetHtml(html: string): string {
	// Split on <mark> and </mark> tags (case-insensitive), escape everything else
	const parts = html.split(/(<\/?mark>)/gi);
	return parts
		.map((part) => {
			const lower = part.toLowerCase();
			if (lower === '<mark>' || lower === '</mark>') return lower;
			return part
				.replace(/&/g, '&amp;')
				.replace(/</g, '&lt;')
				.replace(/>/g, '&gt;')
				.replace(/"/g, '&quot;')
				.replace(/'/g, '&#39;');
		})
		.join('');
}

/**
 * Sanitizes mermaid SVG output. Allows full SVG but removes scripts and event handlers.
 */
export function sanitizeMermaidSvg(svg: string): string {
	return DOMPurify.sanitize(svg, {
		USE_PROFILES: { svg: true, svgFilters: true },
		ADD_TAGS: ['foreignObject'],
		FORBID_TAGS: ['script'],
		FORBID_ATTR: [
			'onload', 'onerror', 'onclick', 'onmouseover', 'onfocus', 'onblur',
		],
	});
}
