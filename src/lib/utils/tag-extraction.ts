const FRONTMATTER_REGEX = /^---\r?\n([\s\S]*?)\r?\n---/;
const INLINE_TAG_REGEX = /(?:^|\s)#([\p{L}_][\p{L}\d_/-]*)/gmu;

/**
 * Finds the index of a top-level YAML key, skipping lines inside multi-line quoted values.
 * Returns -1 if not found.
 */
function findTopLevelKey(lines: string[], key: string): number {
	const keyRe = new RegExp(`^${key}\\s*:`);
	let inMultilineQuote = false;
	let quoteChar = '';

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];

		if (inMultilineQuote) {
			if (line.trimEnd().endsWith(quoteChar)) {
				inMultilineQuote = false;
			}
			continue;
		}

		if (keyRe.test(line)) return i;

		// Check if this line's value opens an unclosed quote (multi-line string)
		const valueMatch = line.match(/^\w[\w\s-]*:\s*(.*)/);
		if (valueMatch) {
			const value = valueMatch[1].trim();
			if (value.length > 0 && (value[0] === '"' || value[0] === "'")) {
				const q = value[0];
				// Only unclosed if the quote isn't closed on the same line
				if (!value.endsWith(q) || value.length === 1) {
					inMultilineQuote = true;
					quoteChar = q;
				}
			}
		}
	}

	return -1;
}

export function extractFrontmatterTags(content: string): string[] {
	const fmMatch = content.match(FRONTMATTER_REGEX);
	if (!fmMatch) return [];

	const yaml = fmMatch[1];
	const lines = yaml.split(/\r?\n/);

	const tagsLineIndex = findTopLevelKey(lines, 'tags');
	if (tagsLineIndex === -1) return [];

	const tagsLine = lines[tagsLineIndex];
	const valueAfterColon = tagsLine.replace(/^tags\s*:\s*/, '').trim();

	// Inline array: [foo, bar]
	if (valueAfterColon.startsWith('[')) {
		const inner = valueAfterColon.slice(1, valueAfterColon.lastIndexOf(']'));
		return inner
			.split(',')
			.map((t) => t.trim().replace(/^["']|["']$/g, '').replace(/^#/, ''))
			.filter(Boolean);
	}

	// Single value on same line
	if (valueAfterColon) {
		return [valueAfterColon.replace(/^["']|["']$/g, '').replace(/^#/, '')];
	}

	// Block array (lines starting with -)
	const tags: string[] = [];
	for (let i = tagsLineIndex + 1; i < lines.length; i++) {
		const line = lines[i];
		const itemMatch = line.match(/^\s*-\s+(.+)$/);
		if (itemMatch) {
			tags.push(itemMatch[1].trim().replace(/^["']|["']$/g, '').replace(/^#/, ''));
		} else if (line.trim() === '') {
			continue;
		} else {
			break;
		}
	}

	return tags.filter(Boolean);
}

export function extractInlineTags(content: string): string[] {
	// Remove frontmatter
	let text = content.replace(FRONTMATTER_REGEX, '');

	// Remove fenced code blocks
	text = text.replace(/```[\s\S]*?```/g, '');

	// Remove inline code
	text = text.replace(/`[^`]+`/g, '');

	// Remove HTML comments (tags inside <!-- --> should not be extracted)
	text = text.replace(/<!--[\s\S]*?-->/g, '');

	const tags: string[] = [];

	for (const match of text.matchAll(INLINE_TAG_REGEX)) {
		const tag = match[1].replace(/\/+$/, '');
		if (tag) tags.push(tag);
	}

	return [...new Set(tags)];
}

export function extractAllTags(content: string): string[] {
	const frontmatterTags = extractFrontmatterTags(content);
	const inlineTags = extractInlineTags(content);
	const all = [...frontmatterTags, ...inlineTags];

	// Deduplicate case-insensitively, keep first occurrence
	const seen = new Map<string, string>();
	for (const tag of all) {
		const lower = tag.toLowerCase();
		if (!seen.has(lower)) {
			seen.set(lower, tag);
		}
	}

	return Array.from(seen.values());
}
