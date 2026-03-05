/** Regex matching any ATX heading */
const HEADING_RE = /^(#{1,6})\s+(.+)$/;

/**
 * Extracts the section under a heading from file content.
 * Returns all lines from the heading to the next heading of same or higher level.
 */
export function extractHeadingSection(content: string, headingName: string): string | null {
	const lines = content.split('\n');
	let startIdx = -1;
	let headingLevel = 0;

	for (let i = 0; i < lines.length; i++) {
		const match = HEADING_RE.exec(lines[i]);
		if (match && match[2].trim().toLowerCase() === headingName.toLowerCase()) {
			startIdx = i;
			headingLevel = match[1].length;
			break;
		}
	}

	if (startIdx === -1) return null;

	let endIdx = lines.length;
	for (let i = startIdx + 1; i < lines.length; i++) {
		const match = HEADING_RE.exec(lines[i]);
		if (match && match[1].length <= headingLevel) {
			endIdx = i;
			break;
		}
	}

	return lines.slice(startIdx, endIdx).join('\n').trimEnd();
}

/**
 * Extracts the block (paragraph/line) identified by a block ID marker (`^blockid`).
 * Returns the line text without the block ID marker.
 */
export function extractBlockContent(content: string, blockId: string): string | null {
	const marker = `^${blockId}`;
	const lines = content.split('\n');

	for (const line of lines) {
		if (line.includes(marker)) {
			return line.replace(/\s*\^[^\s]+\s*$/, '').trim();
		}
	}

	return null;
}

/** Strips YAML frontmatter from content if present */
export function stripFrontmatter(content: string): string {
	if (!content.startsWith('---')) return content;
	const endIdx = content.indexOf('\n---', 3);
	if (endIdx === -1) return content;
	// Verify the closing delimiter is on its own line (followed by \n or end-of-string)
	const afterDelimiter = endIdx + 4; // skip '\n---'
	if (afterDelimiter < content.length && content[afterDelimiter] !== '\n') return content;
	return content.substring(afterDelimiter).trimStart();
}

/** Maximum characters to show for a full-note embed preview */
const MAX_PREVIEW_LENGTH = 500;

/**
 * Gets a preview of the full note content (without frontmatter).
 * Truncates at MAX_PREVIEW_LENGTH with ellipsis.
 */
export function getNotePreview(content: string): string {
	const body = stripFrontmatter(content).trim();
	if (body.length <= MAX_PREVIEW_LENGTH) return body;
	return body.substring(0, MAX_PREVIEW_LENGTH) + '…';
}
