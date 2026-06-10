/**
 * Pure converter: clipboard HTML with `<a href>` anchors → plain text with
 * markdown links.
 *
 * Apps like Slack put the human-readable label in `text/plain` and the URL
 * only in `text/html` (`<a href="url">label</a>`), so a plain-text paste
 * silently drops the URL. This converter rewrites each anchor as a markdown
 * link while keeping the surrounding text; other markup falls back to its
 * plain-text rendering (no rich paste — bold, lists, images out of scope),
 * but line structure is preserved: `<br>` and block-element boundaries
 * become newlines, since multi-line Slack copies encode line breaks only
 * in the HTML flavor.
 *
 * Conservative trigger: many apps put `text/html` on the clipboard even for
 * plain text, so this must not hijack normal pastes. Returns `null` (caller
 * falls through to the next paste handler) unless the HTML contains at least
 * one anchor whose URL is NOT already present in the `text/plain` flavor.
 */

/** Block-level tags whose boundaries become line breaks during text extraction. */
const BLOCK_TAGS = new Set([
	'ADDRESS', 'ARTICLE', 'ASIDE', 'BLOCKQUOTE', 'DD', 'DIV', 'DL', 'DT',
	'FIELDSET', 'FIGCAPTION', 'FIGURE', 'FOOTER', 'H1', 'H2', 'H3', 'H4',
	'H5', 'H6', 'HEADER', 'HR', 'LI', 'MAIN', 'NAV', 'OL', 'P', 'PRE',
	'SECTION', 'TABLE', 'TR', 'UL',
]);

/**
 * Extracts the text of a parsed clipboard fragment, emitting `\n` for each
 * `<br>` and at most one `\n` per block-element boundary. `Node.textContent`
 * contributes nothing for either, which would jam multi-line pastes
 * (e.g. Slack messages) onto a single line.
 */
function blockAwareText(root: Element): string {
	let out = '';
	const blockBoundary = () => {
		if (out.length > 0 && !out.endsWith('\n')) out += '\n';
	};
	const walk = (node: Node) => {
		if (node.nodeType === Node.TEXT_NODE) {
			out += node.nodeValue ?? '';
			return;
		}
		if (node.nodeType !== Node.ELEMENT_NODE) return;
		const tag = (node as Element).tagName;
		if (tag === 'BR') {
			out += '\n';
			return;
		}
		const isBlock = BLOCK_TAGS.has(tag);
		if (isBlock) blockBoundary();
		node.childNodes.forEach(walk);
		if (isBlock) blockBoundary();
	};
	root.childNodes.forEach(walk);
	return out;
}

/**
 * Converts clipboard HTML into plain text with each `<a href>` rewritten as
 * a markdown link, or returns `null` when the paste should fall through.
 *
 * Anchor rewrite rules:
 *   - text differs from href → `[text](href)`
 *   - text equals href (raw URL copied) or is empty → bare href
 *   - empty href → anchor text as-is
 */
export function htmlLinksToMarkdown(html: string, plainText: string): string | null {
	if (!html) return null;

	const doc = new DOMParser().parseFromString(html, 'text/html');
	const anchors = Array.from(doc.querySelectorAll('a[href]'));
	if (anchors.length === 0) return null;

	const hasNewUrl = anchors.some((anchor) => {
		const href = anchor.getAttribute('href') ?? '';
		return href !== '' && !plainText.includes(href);
	});
	if (!hasNewUrl) return null;

	for (const anchor of anchors) {
		const href = anchor.getAttribute('href') ?? '';
		const text = (anchor.textContent ?? '').replace(/\s+/g, ' ').trim();
		let replacement: string;
		if (href === '') {
			replacement = text;
		} else if (text === '' || text === href) {
			replacement = href;
		} else {
			replacement = `[${text}](${href})`;
		}
		anchor.replaceWith(doc.createTextNode(replacement));
	}

	const result = blockAwareText(doc.body).replace(/^\n+/, '').replace(/\n+$/, '');
	return result.length > 0 ? result : null;
}
