const FRONTMATTER_REGEX = /^---\r?\n[\s\S]*?\r?\n---\r?\n?/;

/** Counts the number of words in a text string, excluding YAML frontmatter */
export function countWords(text: string): number {
	const body = text.replace(FRONTMATTER_REGEX, '');
	const trimmed = body.trim();
	if (trimmed === '') return 0;
	return trimmed.split(/\s+/).length;
}

/** Counts the number of characters in a text string, excluding YAML frontmatter */
export function countCharacters(text: string): number {
	const body = text.replace(FRONTMATTER_REGEX, '');
	return body.length;
}

/** Estimates reading time in minutes based on 200 words per minute */
export function estimateReadingTime(wordCount: number): number {
	return Math.max(1, Math.ceil(wordCount / 200));
}
