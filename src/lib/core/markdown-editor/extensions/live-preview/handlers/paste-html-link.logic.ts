/**
 * Pure converter: clipboard HTML with `<a href>` anchors → plain text with
 * markdown links.
 *
 * Apps like Slack put the human-readable label in `text/plain` and the URL
 * only in `text/html` (`<a href="url">label</a>`), so a plain-text paste
 * silently drops the URL. This converter rewrites each anchor as a markdown
 * link while keeping the surrounding text; all other markup falls back to
 * its plain-text rendering (no rich paste — bold, lists, images out of scope).
 *
 * Conservative trigger: many apps put `text/html` on the clipboard even for
 * plain text, so this must not hijack normal pastes. Returns `null` (caller
 * falls through to the next paste handler) unless the HTML contains at least
 * one anchor whose URL is NOT already present in the `text/plain` flavor.
 */

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
		const text = (anchor.textContent ?? '').trim();
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

	const result = doc.body.textContent ?? '';
	return result.length > 0 ? result : null;
}
